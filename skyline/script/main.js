var app = angular.module('app', []);

app.directive('game', function(MainLoop){
  return {
    restrict: 'A',
    link: function(scope, element){
      MainLoop.setElement(element[0]);
    }
  };
});

// main loop
app.factory('MainLoop', function(Camera, Gameplay, Explosion, Background){
  var MainLoop = {};



  // the 2D context of the canvas
  var canvas = null;

  // the canvas element
  var canvasElement = null;

  MainLoop.setElement = function(element){
    canvas = element.getContext('2d');
    canvasElement = element;
    canvasElement.width = window.innerWidth;

    canvasElement.height = window.innerHeight +50 ;

    Gameplay.setContext(canvas, canvasElement);

    // make it crispy!  
    canvas['imageSmoothingEnabled'] = false;
    canvas['mozImageSmoothingEnabled'] = false;
    canvas['webkitImageSmoothingEnabled'] = false;

    MainLoop.startDrawCycle();
  };

  var clearCanvas = function(){
    // canvas.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasElement.width = canvasElement.width;
  };

  var showFPS = function(time){
    var FPS = Math.round(1000/time);
    canvas.font = "bold 18px sans-serif";
    canvas.fillText(FPS, Camera.positionX+canvasElement.width/2-40, Camera.positionY+canvasElement.height/2-20);
  };
  
  var lastTime = new Date();

  MainLoop.elapsedTime = 0;


  // main drawing loop
  var redraw = function(timestamp){
    // before starting to draw, always clean the canvas first
    clearCanvas();

    // canvas.fillStyle = '#000';
    // canvas.fillRect(0,0,canvasElement.width, canvasElement.height);
    Background.drawBackground(canvas,canvasElement);

    // compute elapsed time
    var currentTime = timestamp;
    if(!currentTime)
      currentTime = new Date();
    var elapsedTime = currentTime - lastTime;

    // get the newest camera position
    Camera.updateCamera(canvas);

    

    // // 
    Explosion.updateParticles(elapsedTime);

  


    // draw FPS
    showFPS(elapsedTime);

    lastTime = currentTime;
  };

  MainLoop.startDrawCycle = function(){
    var animFrame = window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          null ;

    var recursiveAnim = function(timestamp) {
      redraw(timestamp);
      animFrame(recursiveAnim);
    };

    Background.drawBackground(canvas, canvasElement);

    animFrame(recursiveAnim);
  };

  


  return MainLoop;
});

// CAMERA
app.factory('Camera', function(){
  var Camera = {};

  Camera.positionX = 0;
  Camera.positionY = 0;

  var width = 0;
  var height = 0;

  var cX = 0;
  var cY = 0;

  Camera.setDimensions = function(w,h,canvas){
    width = w;
    height = h;

    cX = w/2;
    cY = h/2;

    canvas.translate(cX, cY);
  };

  // Camera takes the canvas object to translate the canvas according to the camera
  Camera.setCamera = function(x,y,canvas){
    var difX = Camera.positionX - x;
    var difY = Camera.positionY - y;
    Camera.positionX = x;
    Camera.positionY = y;
    // translate only the difference to previous position
    canvas.translate(difX, difY);
  };

  Camera.updateCamera = function(canvas){
    // var players = Players.getPlayerList();
    // var playerCount = players.length;

    // var sumX = 0;
    // var sumY = 0;

    // for(var i in players){
    //   sumX = sumX + players[i].currentPositionX;
    //   sumY = sumY + players[i].currentPositionY;
    // }
    // // set the new computed camera position -> centroid of all player coordinates
    // Camera.setCamera(sumX/playerCount, sumY/playerCount, canvas);
  };

  return Camera;
});

app.factory('Gameplay', ['Explosion', function(Explosion){
  var Gameplay = {};
  var ctx = null;
  var element = null;
  Gameplay.setContext = function(canvas, canvasElement){
    ctx = canvas;
    element = canvasElement;

    element.addEventListener('mousedown', function(event) {
      if (event.offsetX !== undefined) {
        lastX = event.offsetX;
        lastY = event.offsetY;
      } else {
        lastX = event.layerX - event.currentTarget.offsetLeft;
        lastY = event.layerY - event.currentTarget.offsetTop;
      }

      Explosion.startExplosion(lastX,lastY,ctx,100);

    });
  }



  return Gameplay;
}])

app.factory('Background', [function(){
  var Background = {};
  var canvas;
  var canvasElement;

  var canvasLayers = new Array(50);

  var savedBackground = null;

  var saveBackground = function() {
    savedBackground = new Image();
    savedBackground.src = canvasElement.toDataURL('image/png');
  }

  Background.drawBackground = function(_canvas, _canvasElement){
    canvas = _canvas;
    canvasElement = _canvasElement;

    if(savedBackground){
      canvas.drawImage(savedBackground,0,0);
      return;
    }

    blue = 150;
    green = 155;
    red = 255;

    for(var position = 0; position <= canvasLayers.length; position++){
      Background.drawNew(_canvas, _canvasElement, position);
    }

    // canvas.fillStyle = '#fdb'
    // canvas.font = " 50px Geo";
    // canvas.fillText('Skyline', canvasElement.width/2-100, 60);
    saveBackground();

  }

  var blue = 145;
  var green = 160;
  var red = 255;


  Background.drawNew = function(_canvas, _canvasElement, position){
    canvas = _canvas;
    canvasElement = _canvasElement;

    canvas.beginPath();
    if(position===0){
      canvas.fillStyle = 'rgba('+red+','+green+','+blue+',1)'
      canvas.fillRect(0,0,canvasElement.width,canvasElement.height);
    } else {
      canvas.fillStyle = 'rgba('+red+','+green+','+blue+',1)'
      position = position+1;
      for(var i = 0; i<150; i++){
        var width = 150*Math.random();
        canvas.fillRect(i*width,(2-Math.random())*position*15,width,canvasElement.height*Math.random());
      }
    }
    canvas.closePath();

    red = red-30;
    blue= blue-3;
    green = green -5;


  }

  return Background;
}]);

app.factory('Explosion', function(){
  var Explosion = {};
  var canvas = null;

  Explosion.updateParticles = function(elapsedTime){
    Explosion.drawParticles(elapsedTime);
  };

  var startSize = 50;
  var variation = 50;
  var standardTTL = 2000;
  var TTLvar = 1000;
  var velocity = 1;

  var particles = [];

  function Particle(x,y,ttl,color,size,direction,velocity, energy){
    this.x = x;
    this.y = y;

    this.direction = direction;
    this.velocity = velocity;

    this.energy = energy;

    this.ttl = ttl;
    this.color = color;
    this.size = size;
    particles.push(this);
  }

  Explosion.drawParticles = function(elapsedTime){
    var toRemove = [];
    for(var i = particles.length-1; i>=0; i--){
      var p = particles[i];
      canvas.beginPath();
      //fill.arc(p.x, p.y, p.size, 0, 2 * Math.PI, false);
      canvas.fillRect(p.x-p.size/2,p.y-p.size,p.size,p.size);
      var energy = Math.round(p.energy);

      var red = energy;
      var green = Math.round(energy*(1.1-p.size/startSize));
      var blue = Math.round(energy*(1-p.size/startSize));

      canvas.fillStyle = 'rgba('+red+','+green+','+blue+','+Math.round(p.ttl)/100+')';
      canvas.fill();
      canvas.closePath();
      p.ttl = p.ttl - elapsedTime;
      if(p.ttl < 0){
        particles[i] = particles[particles.length-1];
        particles.pop();
      } else {
        p.size = p.size-(33*Math.random()*elapsedTime/1000);

        p.x = p.x + p.velocity*Math.cos(p.direction);
        p.y = p.y - p.velocity*Math.sin(p.direction);

        // physical reaction
        p.y = p.y - 20*elapsedTime/1000;
        p.x = p.x - (Math.random()-0.6)*100*elapsedTime/1000;

        p.velocity = p.velocity * -0.9;
        p.energy = p.energy - 100*elapsedTime/1000;
        

      }
    }
    
  }

  Explosion.startExplosion = function(x,y,_canvas, particles){
    canvas = _canvas;

    var halfvar = variation/2;
    var halfttlvar = TTLvar/2;
    // randomly generate particles
    for(var i = 0; i<particles; i++){
      var rx = x-Math.random()*variation+halfvar;
      var ry = y-Math.random()*variation+halfvar;
      var rttl = standardTTL-Math.random()*TTLvar-halfttlvar;
      // var rcolor = 'rgba('+Math.round(255-Math.random()*50)+','+Math.round(250-Math.random()*200)+',100,1)';
      rcolor = 0;

      var energyVelRand = Math.random();
      var renergy = 255-energyVelRand*100;
      var rsize = startSize-variation*Math.random();
      var rdirection = 2*Math.PI*Math.random();
      var rvelocity = velocity+energyVelRand*100;
      new Particle(rx,ry,rttl,rcolor,rsize, rdirection, rvelocity, renergy);
    }
     
  }

  return Explosion;
});

