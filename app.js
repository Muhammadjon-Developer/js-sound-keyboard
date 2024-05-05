let lis = [].slice.call(document.querySelectorAll(':not(#controls) > li'));
let buttons = [].slice.call(document.querySelectorAll('button:not(#space)'));
let controls = document.querySelector('#controls li');
let space = document.getElementById('space');

polyfillKey(); //I like the simplicity of e.key in keyboard event listeners, which has almost full support in line with the web audio api outside of Safari, so polyfill as needed.

let checkbox = document.getElementById('animations');

let liAnimations = {};
let buttonAnimations = {};


let context;
let oscillators = {};
let gainNodes = {};
let primaryGain;
let baseFrequency = 110;
let EFFECTIVELY_OFF = 0.0000001;
let ON = 0.02;
let LITTLE_ON = 0.2;


buttons.forEach(function(btn, i) {
  btn.setAttribute('disabled', 'disabled');
});


//slight animation for mute button
controls.animate([
  {transform: 'rotate(-1.2deg)'},
  {transform: 'rotate(1.2deg)'}
], {
  duration: Math.random() * 2000 + 8000,
  easing: 'ease-in-out',
  iterations: Infinity,
  direction: 'alternate',
  delay: -12000
});

//slow animations for each key item
lis.forEach(function(item) {
  let x = Math.random() * 20 - 35;
  let y2 = Math.random() * 20 + 4;
  
  item.animate([
    { transform: 'rotate('+x+'deg)' },
    { transform: 'rotate('+y2+'deg)' }
  ], {
    duration: Math.random() * 6000 + 4000,
    iterations: Infinity,
    direction: 'alternate',
    delay: -(Math.random() * 17000),
    easing: 'ease-in-out'
  })
});





//in addition to pointer events, keyboard events are also mapped on the body
document.body.addEventListener('keypress', keyDown);

function pointerDown(e) {
  start(e.currentTarget.textContent.toLowerCase());
}
function pointerUp(e) {
  end(e.currentTarget.textContent.toLowerCase());
}
function pointerOut(e) {
  let char = e.currentTarget.textContent.toLowerCase();
  if (buttonAnimations[char].playState === 'running') {
    end(char);
  }
}

//check if a valid key for notes, or if spacebar (for muting)
function keyDown(e) {
  let char = (e.key || '').toLowerCase();
  if (buttonAnimations[char]) {
    if (buttonAnimations[char].playState === 'running' || liAnimations[char][0].currentTime > 0) {
      end(char);
    } else {
      start(char);
    }
  } else if (char === ' ') {
    spacer(e);
  }
}

//Turn up the gain on the specified key, start the animations (full shaking and speed, if enabled)
function start(char) {
  console.log('start', char);
  if (!checkbox.checked) {
    buttonAnimations[char].play();
  } 
  liAnimations[char].forEach(function(animation) {
    animation.play();
    animation.currentTime = 100 + 225 * Math.random();
  });
  gainNodes[char].gain.setValueAtTime(LITTLE_ON, context.currentTime);
}

//Fade out via the gain on the specified key, cancel the animations
function end(char) {
  console.log('end', char);
  buttonAnimations[char].pause();
  liAnimations[char].forEach(function(animation) {
    animation.cancel();
  });
  gainNodes[char].gain.linearRampToValueAtTime(EFFECTIVELY_OFF, context.currentTime + .4);
}

//map the special handler for spacebar via pointer, for muting
space.addEventListener('click', spacer);

//mute/unmute
function spacer(e) {
//setup for primary volume and audio context
  if (!context && (window.AudioContext || window.webkitAudioContext)) {
    console.log('setup audio context')
    context = new (window.AudioContext || window.webkitAudioContext)();
    primaryGain = context.createGain();
    primaryGain.gain.value = ON;
    primaryGain.connect(context.destination);
    
//set up pointer event listeners
//set up (and pause/cancel) frantic animations for active keys
//set up audio mapping
buttons.forEach(function(btn, i) {
  btn.removeAttribute('disabled');
  if (window.PointerEvent) {
    btn.addEventListener('pointerdown', pointerDown);
    btn.addEventListener('pointerup', pointerUp);
    btn.addEventListener('pointerout', pointerOut);
  } else {
    btn.addEventListener('touchstart', pointerDown);
    btn.addEventListener('touchend', pointerUp);
    btn.addEventListener('touchcancel', pointerOut);
    btn.addEventListener('mousedown', pointerDown);
    btn.addEventListener('mouseup', pointerUp);
    btn.addEventListener('mouseout', pointerOut);
  }
  
  let char = btn.textContent.toLowerCase();
  
  //fast button shake
  buttonAnimations[char] = btn.animate([
    { transform: 'translate(-.5vmin, -.25vmin)' },
    { transform: 'translate(.5vmin, .25vmin)' }
  ], {
    duration: 68,
    iterations: Infinity,
    direction: 'alternate'
  });
  buttonAnimations[char].cancel();
  
  liAnimations[char] = [];
 
  //three color circles scaling up behind button
  [].slice.call(btn.parentNode.querySelectorAll('i')).forEach(function(border, i) {
    let newAnimation = border.animate([
      { transform: 'scale(.8)', opacity: 1 },
      { transform: 'scale(1)', opacity: 1 }
    ], {
      duration: 225,
      iterations: Infinity,
      direction: 'alternate',
      delay: 225 / 3 * i
    });
    newAnimation.pause();
    liAnimations[char].push(newAnimation);
  });
  
  
  
  
setupAnimationsToggle();
  
  
  
  //if web audio api supported, create a new oscillator for the key, with a frequency such that the top left of the keyboard is A2 and goes up by half steps going right and down. The '?' therefore is A5.
  //Turn the gain low by default
  if (context) {
    let oscillator = context.createOscillator();
    let gainNode = context.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.value = baseFrequency * (Math.pow(1.059463094359, i)); // value in hertz, http://www.phy.mtu.edu/~suits/NoteFreqCalcs.html
    
    console.log(char, oscillator.frequency.value)
    oscillator.detune.value = 100; // value in cents
    oscillator.connect(gainNode);

    gainNode.gain.value = EFFECTIVELY_OFF;
    gainNode.connect(primaryGain);

    oscillator.start(0);
    
    oscillators[char] = (oscillator);
    gainNodes[char] = (gainNode);
  }
});
  }
  if (space.textContent === 'Mute') {
    document.documentElement.classList.add('muted');
    primaryGain.gain.value = EFFECTIVELY_OFF;
    space.textContent = 'Muted';
  } else { document.documentElement.classList.remove('muted');
    primaryGain.gain.value = ON;
    space.textContent = 'Mute';
  }
}

//add event for animations toggle and affect all running animations based on new value
function setupAnimationsToggle() {
checkbox.addEventListener('change', function(e) {
  if (checkbox.checked) {
    document.documentElement.classList.remove('more-animations');
    for (let key in buttonAnimations) {
      buttonAnimations[key].cancel();
        
      liAnimations[key].forEach(function(animation) {
        animation.playbackRate = 0;
      });
    }
  } else {
    document.documentElement.classList.add('more-animations');
    for (let key in liAnimations) {
      if (liAnimations[key][0].playState === 'running') {
        buttonAnimations[key].play();
      }
        
      liAnimations[key].forEach(function(animation) {
        animation.playbackRate = 1;
      });
    }
  }
});
}
  







//just the e.key polyfill
function polyfillKey() {
  if (!('KeyboardEvent' in window) ||
        'key' in KeyboardEvent.prototype) {
    return false;
  }
  
  console.log('polyfilling KeyboardEvent.prototype.key')
  let keys = {};
  let letter = '';
  for (let i = 48; i < 58; ++i) {
    letter = String.fromCharCode(i);
    keys[i] = letter;
  }
  for (let i = 65; i < 91; ++i) {
    letter = String.fromCharCode(i);
    keys[i] = letter.toUpperCase();
  }
  for (let i = 97; i < 123; ++i) {
    letter = String.fromCharCode(i);
    keys[i] = letter.toLowerCase();
  }
  keys[63] = '?';
  let proto = {
    get: function (x) {
      let key = keys[this.which || this.keyCode];
      console.log(key);
      return key;
    }
  };
  Object.defineProperty(KeyboardEvent.prototype, 'key', proto);
}






//the inevitable easter egg-ish thing
let spoooooookyMonth = (new Date()).getMonth() === 9;
if (spoooooookyMonth) {
  document.documentElement.style.setProperty('--border1', '#FF9305'); document.documentElement.style.setProperty('--border2', '#4A4A4A'); document.documentElement.style.setProperty('--border3', '#A75401');
}