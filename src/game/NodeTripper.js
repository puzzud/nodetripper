/** @constructor */
NodeTripper =
{
  game: null,

  projectInfo: null,

  settings:
  {
    local:
    {
      mute: false
    },
    session:
    {

    }
  },

  screenWidth: 960,
  screenHeight: 540,

  titleStyle: { font: "72px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 6 },

  buttonTextColor: 0xffffff,
  buttonTextOverColor: 0xffff00,
  buttonStyle: { font: "32px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 },
  buttonActiveStyle: { font: "32px Arial", fill: "#ffffff", fontStyle: "italic", stroke: "#000000", strokeThickness: 4 },

  activeButton: null,

  backButtonCallback: null,

  gamepadList: [],
  gamepadMenuCallbackList: [],
  lastGamepadYAxis: 0.0,

  // NW (formerly Node Webkit) container.
  nw:
  {
    gui: null,
    window: null
  }
};

NodeTripper.run = function()
{
  this.game = new Phaser.Game( this.screenWidth, this.screenHeight,
                               Phaser.AUTO, "", this );

  this.game.state.add( NodeTripper.Boot.stateKey, NodeTripper.Boot );
  this.game.state.add( NodeTripper.Preloader.stateKey, NodeTripper.Preloader );
  this.game.state.add( NodeTripper.MainMenu.stateKey, NodeTripper.MainMenu );
  this.game.state.add( NodeTripper.Game.stateKey, NodeTripper.Game );
  this.game.state.add( NodeTripper.About.stateKey, NodeTripper.About );

  this.game.state.start( NodeTripper.Boot.stateKey );

  this.setupPlatform();
};

NodeTripper.setupPlatform = function()
{
  // TODO: Abstract differences between using NW JS and Cordova.
  this.setupNw();
  this.setupCordova();
};

NodeTripper.setupNw = function()
{
  // Set up NW.
  if( typeof( require ) !== "undefined" )
  {
    try
    {
      this.nw.gui = require( "nw.gui" );
    }
    catch( exception )
    {
      this.nw.gui = null;
      this.nw.window = null;
      
      console.error( "NW is not present." );
      return;
    }

    if( this.nw.gui !== null )
    {
      this.nw.window = this.nw.gui.Window.get();
      this.nw.window.show();
    }
  }
};

NodeTripper.setupCordova = function()
{
  if( window.cordova !== undefined )
  {
    document.addEventListener( "deviceready", this.onDeviceReady.bind( this ), false );
  }
};

NodeTripper.onDeviceReady = function()
{
  document.addEventListener( "backbutton", this.onBackButton.bind( this ), false );
};

NodeTripper.onBackButton = function( event )
{
  if( this.backButtonCallback !== null )
  {
    event.preventDefault();
    this.backButtonCallback.call( this.game.state.getCurrentState() );
  }
};

NodeTripper.quit = function()
{
  if( NodeTripper.nw.window !== null )
  {
    // Close application window.
    NodeTripper.nw.window.close();
  }
  else
  if( window.cordova !== undefined && cordova.platformId !== "browser" )
  {
    // Close application.
    navigator.app.exitApp();
  }
  else
  {
    // Redirect to project website if running in browser.
    if( NodeTripper.projectInfo === null ||
        NodeTripper.projectInfo.homepage === "" )
    {
      console.warn( "homepage not set in package.json." );
      return;
    }
    
    window.location = NodeTripper.projectInfo.homepage;
  }
};

NodeTripper.setupButtonKeys = function( state )
{
  state.cursorKeys = state.input.keyboard.createCursorKeys();
  state.cursorKeys.up.onDown.add( NodeTripper.upButtonDown, state );
  state.cursorKeys.down.onDown.add( NodeTripper.downButtonDown, state );

  state.spaceBar = state.input.keyboard.addKey( Phaser.Keyboard.SPACEBAR );
  state.spaceBar.onDown.add( NodeTripper.activateButtonDown, state );
  state.enterKey = state.input.keyboard.addKey( Phaser.Keyboard.ENTER );
  state.enterKey.onDown.add( NodeTripper.activateButtonDown, state );
};

NodeTripper.clearButtonKeys = function( state )
{
  state.cursorKeys.up.onDown.removeAll();
  state.cursorKeys.down.onDown.removeAll();
  state.cursorKeys = null;
  
  state.spaceBar.onDown.removeAll();
  state.spaceBar = null;
  state.enterKey.onDown.removeAll();
  state.enterKey = null;
};

NodeTripper.cycleActiveButton = function( direction )
{
  var state = this.game.state.getCurrentState();

  var index = -1;

  // Cycle active button.
  if( NodeTripper.activeButton === null )
  {
    index = 0;
  }
  else
  {
    index = state.buttonList.indexOf( NodeTripper.activeButton );
    var currentIndex = index;

    index += direction;
    if( index >= state.buttonList.length )
    {
      index = 0;
    }
    else
    if( index < 0 )
    {
      index = state.buttonList.length - 1;
    }

    if( currentIndex === index )
    {
      // No need to change active buttons.
      return;
    }

    NodeTripper.setActiveButton( null );
  }

  NodeTripper.setActiveButton( state.buttonList[index] );
};

NodeTripper.upButtonDown = function( button )
{
  NodeTripper.cycleActiveButton( -1 );
};

NodeTripper.downButtonDown = function( button )
{
  NodeTripper.cycleActiveButton( 1 );
};

NodeTripper.activateButtonDown = function( button )
{
  var activeButton = NodeTripper.activeButton;
  if( activeButton === null )
  {
    // Default active button to start button for quick navigation.
    activeButton = this.buttonList[0];
    if( activeButton === undefined )
    {
      activeButton = null;
    }
    
    NodeTripper.setActiveButton( activeButton );
  }
  
  // Directly call state's logic for this button.
  activeButton.activate.call( this.game.state.getCurrentState(), activeButton, null );
};

NodeTripper.createTextButton = function( x, y, text, callback, callbackContext, style )
{
  var button = this.game.add.button( x, y, null, callback, callbackContext );
  button.anchor.setTo( 0.5, 0.5 );

  if( style === undefined )
  {
    style = this.buttonStyle;
  }
  
  var label = new Phaser.Text( this.game, 0, 0, text, style );
  label.anchor.setTo( 0.5, 0.5 );

  label.tint = this.buttonTextColor;

  button.addChild( label );
  button.texture.baseTexture.skipRender = false; // TODO: Remove when Phaser 2.4.5 releases with fix.

  button.events.onInputOver.add( NodeTripper.textButtonOnInputOver, callbackContext );
  button.events.onInputOut.add( NodeTripper.textButtonOnInputOut, callbackContext );

  button.activate = callback;

  return button;
};

NodeTripper.setActiveButton = function( button )
{
  if( NodeTripper.activeButton !== null )
  {
    NodeTripper.activeButton.children[0].tint = NodeTripper.buttonTextColor;
    this.game.add.tween( NodeTripper.activeButton.scale ).to( { x: 1.0, y: 1.0 }, 125, Phaser.Easing.Linear.None, true );
  }

  NodeTripper.activeButton = button;

  if( button !== null )
  {
    button.children[0].tint = NodeTripper.buttonTextOverColor;
    this.game.add.tween( button.scale ).to( { x: 1.125, y: 1.125 }, 125, Phaser.Easing.Linear.None, true );
  }
};

NodeTripper.textButtonOnInputOver = function( button, pointer )
{
  NodeTripper.setActiveButton( button );
};

NodeTripper.textButtonOnInputOut = function( button, pointer )
{
  NodeTripper.setActiveButton( null );
};

NodeTripper.setupGamepadsForMenu = function()
{
  this.gamepadMenuCallbackList.length = 0;
  this.gamepadMenuCallbackList.onDown = this.gamepadOnDown;
  this.gamepadMenuCallbackList.onAxis = this.gamepadOnAxis;

  this.game.input.gamepad.addCallbacks( this, this.gamepadMenuCallbackList );
};

NodeTripper.gamepadOnDown = function( buttonIndex, buttonValue, gamepadIndex )
{
  console.log( buttonIndex, buttonValue, gamepadIndex );

  var cycleDirection = 0;

  switch( buttonIndex )
  {
    case Phaser.Gamepad.XBOX360_DPAD_UP:
    {
      cycleDirection = -1;
      break;
    }

    case Phaser.Gamepad.XBOX360_DPAD_DOWN:
    {
      cycleDirection = 1;
      break;
    }
  }

  if( cycleDirection !== 0 )
  {
    this.cycleActiveButton( cycleDirection );
  }
  else
  {
    if( buttonIndex === Phaser.Gamepad.XBOX360_B )
    {
      this.activateButtonDown( this.activeButton );
    }
  }
};

NodeTripper.gamepadOnAxis = function( gamepad, axisIndex, axisValue )
{
  console.log( axisIndex, axisValue );

  if( axisIndex === Phaser.Gamepad.XBOX360_STICK_LEFT_Y )
  {
    var cycleDirection = 0;

    if( axisValue < -0.1 && this.lastGamepadYAxis >= -0.1 )
    {
      cycleDirection = -1;
    }
    else
    if( axisValue > 0.1 && this.lastGamepadYAxis <= 0.1 )
    {
      cycleDirection = 1;
    }

    this.lastGamepadYAxis = axisValue;

    if( cycleDirection !== 0 )
    {
      this.cycleActiveButton( cycleDirection );
    }
  }
};

NodeTripper.setupTitleAndText = function( state )
{
  // Title.
  var titleTextX = state.world.centerX;
  var titleTextY = ( state.world.height * ( 1 - 0.67 ) ) | 0;
  
  var titleText = state.add.text( titleTextX, titleTextY,
                                  NodeTripper.projectInfo.window.title, NodeTripper.titleStyle );

  titleText.anchor.setTo( 0.5 );

  // All text.
  var allTextGroup = state.game.add.group();
  allTextGroup.add( titleText );
  allTextGroup.add( state.buttonGroup );
  allTextGroup.alpha = 0.0;

  this.game.add.tween( allTextGroup ).to( { alpha: 1 }, 500, Phaser.Easing.Linear.None, true );
};

NodeTripper.stopSounds = function( soundList )
{
  if( soundList === undefined )
  {
    this.game.sound.stopAll();
    return;
  }

  var sound = null;
  for( var i = 0; i < soundList.length; i++ )
  {
    sound = soundList[i];
    sound.stop();
  }
};

NodeTripper.getMute = function()
{
  return this.settings.local.mute;
};

NodeTripper.setMute = function( mute )
{
  if( this.settings.local.mute !== mute )
  {
    this.settings.local.mute = mute;

    this.storeLocalSettings();
  }

  this.game.sound.mute = mute;
};

NodeTripper.retrieveLocalSettings = function()
{
  if( typeof( Storage ) === undefined )
  {
    console.warn( "Local Storage not supported." );
    return;
  }

  var settingsLocal = localStorage.getItem( "localSettings" );
  if( settingsLocal === null )
  {
    // No local settings saved yet.
    return;
  }
  
  this.settings.local = JSON.parse( settingsLocal );

  // Do any actions that should come out of potentially changing
  // any local settings.
  this.setMute( this.settings.local.mute );
};

NodeTripper.storeLocalSettings = function()
{
  if( typeof( Storage ) === undefined )
  {
    console.warn( "Local Storage not supported." );
    return;
  }

  localStorage.setItem( "localSettings", JSON.stringify( this.settings.local ) );
};
