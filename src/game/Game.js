/** @constructor */
NodeTripper.Game = function( game )
{
  this.cursorKeys = null;
  this.spaceBar = null;
  this.enterKey = null;
  this.escapeKey = null;

  this.buttonList = [];
  this.exitButton = null;
  this.buttonGroup = null;

  this.modalYesButton = null;
  this.modalNoButton = null;
  this.modalGroup = null;

  this.gamepadList = NodeTripper.gamepadList;
  this.gamepadCallbackList =
  {
    onDown: this.gamepadOnDown
  };

  this.circleSprite = null;
  this.targetPoint = new Phaser.Point();

  this.bell = null;
  this.soundList = [];

  this.currentTile = 0;
  this.cursors = null;
  this.player = null;
  this.facing = 'left';
  this.jumpTimer = 0;
  this.jumpButton = null;
};

NodeTripper.Game.stateKey = "Game";

NodeTripper.Game.prototype.init = function()
{
  
};

NodeTripper.Game.prototype.create = function()
{
  this.stage.backgroundColor = 0x171642; 

  this.setupInput();
  this.setupGraphics();
  this.setupSounds();
};

NodeTripper.Game.prototype.setupInput = function()
{
  this.escapeKey = this.input.keyboard.addKey( Phaser.Keyboard.ESC );
  this.escapeKey.onDown.add( this.escapeKeyDown, this );

  NodeTripper.backButtonCallback = this.escapeKeyDown;

  // Buttons.
  NodeTripper.activeButton = null;

  this.exitButton = NodeTripper.createTextButton( 0, 32,
                                                "Exit", this.escapeKeyDown, this );

  // Position button based on width.
  // NOTE: Using child label width, as parent button width member is not
  // reliable seemingly after newly created label is added after creating button.
  // Need to file issue with Phaser.
  this.exitButton.position.x = this.game.width - this.exitButton.children[0].width - 16;
  this.exitButton.input.priorityID = 1;

  var mute = NodeTripper.getMute();
  var muteText = mute ? "Unmute" : "  Mute";
  var muteButtonStyle = mute ? NodeTripper.buttonActiveStyle : NodeTripper.buttonStyle;
  this.muteButton = NodeTripper.createTextButton( 0, 32,
                                                muteText, this.toggleMute, this, muteButtonStyle );

  this.muteButton.position.x = this.exitButton.position.x - this.muteButton.children[0].width;
  this.muteButton.input.priorityID = 1;

  this.buttonGroup = this.game.add.group();
  this.buttonGroup.add( this.exitButton );
  this.buttonGroup.add( this.muteButton );

  // Modal dialog buttons.
  this.modalYesButton = NodeTripper.createTextButton( 0, 0,
                                                    "Yes", this.returnToMainMenu, this );
  this.modalYesButton.position.setTo( this.game.world.centerX, this.game.world.centerY + 48 * 1 );
  this.modalYesButton.input.priorityID = 3;

  this.modalNoButton = NodeTripper.createTextButton( 0, 0,
                                                   "No", this.toggleModal, this );
  this.modalNoButton.position.setTo( this.game.world.centerX, this.game.world.centerY + 48 * 2 );
  this.modalNoButton.input.priorityID = 3;

  // Gamepads.
  this.setupGamepads();
};

NodeTripper.Game.prototype.setupGamepads = function()
{
  // First reset callbacks.
  this.game.input.gamepad.onDownCallback = null;
  this.game.input.gamepad.onAxisCallback = null;

  // Then set callbacks.
  this.game.input.gamepad.addCallbacks( this, this.gamepadCallbackList );
};

NodeTripper.Game.prototype.setupGraphics = function()
{
  // All text.
  var allTextGroup = this.game.add.group();
  allTextGroup.add( this.buttonGroup );
  allTextGroup.alpha = 0.0;

  this.game.add.tween( allTextGroup ).to( { alpha: 1 }, 500, Phaser.Easing.Linear.None, true );

  this.circleSprite = this.createCircleSprite();

  this.setupTilemap();

  this.game.world.bringToTop( allTextGroup );

  var background = this.game.add.sprite( 0, 0 );
  background.fixedToCamera = true;
  background.scale.setTo( this.game.width, this.game.height );
  background.inputEnabled = true;
  background.input.priorityID = 0;
  background.events.onInputDown.add( this.pointerDown, this );

  this.game.world.sendToBack( background );

  // Set up modal background.
  var bmd = this.game.add.bitmapData( this.game.width, this.game.height );
  bmd.ctx.fillStyle = "rgba(0,0,0,0.5)";
  bmd.ctx.fillRect( 0, 0, this.game.width, 48 * 3 );
  bmd.ctx.fillRect( 0, 48 * 9, this.game.width, 48 * 3 );
  bmd.ctx.fillStyle = "rgba(0,0,0,0.95)";
  bmd.ctx.fillRect( 0, 48 * 3, this.game.width, 48 * 6 );
  var modalBackground = this.game.add.sprite( 0, 0, bmd );
  modalBackground.fixedToCamera = true;
  modalBackground.inputEnabled = true;
  modalBackground.input.priorityID = 2;

  var modalPromptText = "Are you sure you want to exit?";
  var modalPrompt = this.game.add.text( 0, 0, modalPromptText, NodeTripper.buttonStyle );
  modalPrompt.position.setTo( this.game.world.centerX, this.game.world.centerY - 48 * 1 );
  modalPrompt.anchor.setTo( 0.5, 0.5 );

  this.modalGroup = this.game.add.group();
  this.modalGroup.add( modalBackground );
  this.modalGroup.add( modalPrompt );
  this.modalGroup.add( this.modalYesButton );
  this.modalGroup.add( this.modalNoButton );
  this.modalGroup.visible = false;
};

NodeTripper.Game.prototype.setupTilemap = function()
{
  this.game.stage.backgroundColor = '#2d2d2d';

  //  Creates a blank tilemap
  var map = this.game.add.tilemap();

  //  This is our tileset - it's just a BitmapData filled with a selection of randomly colored tiles
  //  but you could generate anything here
  var bmd = this.game.make.bitmapData(32 * 25, 32 * 2);

  var colors = Phaser.Color.HSVColorWheel();

  var i = 0;

  for (var y = 0; y < 2; y++)
  {
      for (var x = 0; x < 25; x++)
      {
          bmd.rect(x * 32, y * 32, 32, 32, colors[i].rgba);
          i += 6;
      }
  }

  //  Add a Tileset image to the map
  map.addTilesetImage('tiles', bmd);

  //  Creates a new blank layer and sets the map dimensions.
  //  In this case the map is 40x30 tiles in size and the tiles are 32x32 pixels in size.
  this.layer = map.create('level1', 40, 30, 32, 32);

  //  Populate some tiles for our player to start on
  map.putTile(30, 2, 10, this.layer);
  map.putTile(30, 3, 10, this.layer);
  map.putTile(30, 4, 10, this.layer);
  map.putTile(31, 7, 12, this.layer);
  map.putTile(31, 8, 12, this.layer);
  map.putTile(31, 9, 12, this.layer);
  map.putTile(32, 12, 14, this.layer);
  map.putTile(32, 13, 14, this.layer);
  map.putTile(32, 14, 14, this.layer);
  map.putTile(34, 17, 16, this.layer);
  map.putTile(34, 18, 16, this.layer);
  map.putTile(34, 19, 16, this.layer);

  map.setCollisionByExclusion([0]);

  this.setupPlayer();
};

NodeTripper.Game.prototype.setupPlayer = function()
{
  this.player = this.game.add.sprite(64, 100, 'dude');
  this.game.physics.arcade.enable(this.player);
  this.game.physics.arcade.gravity.y = 350;

  this.player.body.bounce.y = 0.1;
  this.player.body.collideWorldBounds = true;
  this.player.body.setSize(20, 32, 5, 16);

  this.player.animations.add('left', [0, 1, 2, 3], 10, true);
  this.player.animations.add('turn', [4], 20, true);
  this.player.animations.add('right', [5, 6, 7, 8], 10, true);

  this.cursors = this.game.input.keyboard.createCursorKeys();
  this.jumpButton = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
};

NodeTripper.Game.prototype.setupSounds = function()
{
  this.bell = this.game.add.audio( "bell2" );
  this.soundList.push( this.bell );
};

NodeTripper.Game.prototype.update = function()
{
  this.gamepadUpdate();

  this.updatePlayer();
};

NodeTripper.Game.prototype.updatePlayer = function()
{
  this.game.physics.arcade.collide(this.player, this.layer);

  this.player.body.velocity.x = 0;

  if (this.cursors.left.isDown)
  {
      this.player.body.velocity.x = -150;

      if (this.facing != 'left')
      {
          this.player.animations.play('left');
          this.facing = 'left';
      }
  }
  else if (this.cursors.right.isDown)
  {
      this.player.body.velocity.x = 150;

      if (this.facing != 'right')
      {
          this.player.animations.play('right');
          this.facing = 'right';
      }
  }
  else
  {
      if (this.facing != 'idle')
      {
          this.player.animations.stop();

          if (this.facing == 'left')
          {
              this.player.frame = 0;
          }
          else
          {
              this.player.frame = 5;
          }

          this.facing = 'idle';
      }
  }

  if (this.jumpButton.isDown && this.player.body.onFloor() && this.game.time.now > this.jumpTimer)
  {
      this.player.body.velocity.y = -250;
      this.jumpTimer = this.game.time.now + 750;
  }

};

NodeTripper.Game.prototype.escapeKeyDown = function( button )
{
  NodeTripper.setActiveButton( this.modalNoButton );

  this.toggleModal();
};

NodeTripper.Game.prototype.pointerDown = function( sprite, pointer )
{
  this.targetPoint.copyFrom( pointer );

  var position = this.targetPoint;
  this.makeImpact( position.x, position.y );
};

NodeTripper.Game.prototype.gamepadUpdate = function()
{
  /*if( this.game.input.gamepad.supported && this.game.input.gamepad.active )
  {
    for( var i = 0; i < this.gamepadList.length; i++ )
    {
      var gamepad = this.gamepadList[i];
      if( gamepad.connected )
      {
        if( gamepad.isDown( Phaser.Gamepad.XBOX360_DPAD_UP, 0 ) ||
            gamepad.axis( Phaser.Gamepad.XBOX360_STICK_LEFT_Y ) < -0.1 )
        {
          
        }
        else
        if( gamepad.isDown( Phaser.Gamepad.XBOX360_DPAD_DOWN, 0 ) ||
            gamepad.axis( Phaser.Gamepad.XBOX360_STICK_LEFT_Y ) > 0.1 )
        {
          
        }
      }
    }
  }*/
};

NodeTripper.Game.prototype.gamepadOnDown = function( buttonIndex, buttonValue, gamepadIndex )
{
  this.makeImpact( ( this.game.width / 2 ) | 0, ( this.game.height / 2 ) | 0 );
};

NodeTripper.Game.prototype.toggleModal = function()
{
  this.modalGroup.visible = !this.modalGroup.visible;

  this.buttonList.length = 0;

  if( this.modalGroup.visible )
  {
    NodeTripper.setupButtonKeys( this );

    this.buttonList.push( this.modalYesButton );
    this.buttonList.push( this.modalNoButton );
  }
  else
  {
    NodeTripper.clearButtonKeys( this );
  }
};

NodeTripper.Game.prototype.returnToMainMenu = function()
{
  this.game.sound.stopAll();
  
  this.state.start( NodeTripper.MainMenu.stateKey );
};

NodeTripper.Game.prototype.makeImpact = function( x, y )
{
  if( !!this.bell._sound )
  {
    this.adjustBellPitch();
  }
  else
  {
    this.bell.onPlay.add( this.adjustBellPitch, this );
  }

  this.bell.play();

  this.resetCircleSprite( this.circleSprite, x, y );
};

NodeTripper.Game.prototype.createCircleSprite = function()
{
  var bmd = this.game.add.bitmapData( 128, 128 );

  bmd.ctx.fillStyle = "#999999";
  bmd.ctx.beginPath();
  bmd.ctx.arc( 64, 64, 64, 0, Math.PI * 2, true ); 
  bmd.ctx.closePath();
  bmd.ctx.fill();

  var sprite = this.game.add.sprite( 0, 0, bmd );
  sprite.anchor.set( 0.5 );

  sprite.alpha = 0.0;

  return sprite;
};

NodeTripper.Game.prototype.adjustBellPitch = function()
{
  var verticalScale = 4.0 * ( 1.0 - ( this.targetPoint.y / this.game.world.height ) );
  this.bell._sound.playbackRate.value = verticalScale;
};

NodeTripper.Game.prototype.resetCircleSprite = function( circleSprite, x, y )
{
  circleSprite.position.set( x, y );

  circleSprite.scale.set( 0.5 );
  circleSprite.alpha = 1.0;

  var verticalScale = ( 1.0 - ( y / this.game.world.height ) );
  var colorAdjustment = ( verticalScale * 255 ) | 0;
  
  var r = 255 - colorAdjustment;
  var g = 63;
  var b = 0 + colorAdjustment;

  if( colorAdjustment < 128 )
  {
    g += b;
  }
  else
  {
    g += r;
  }

  circleSprite.tint = ( r << 16 ) + ( g << 8 ) + b;

  this.game.add.tween( circleSprite.scale ).to( { x: 4.0, y: 4.0 }, 500, Phaser.Easing.Sinusoidal.InOut, true );
  this.game.add.tween( circleSprite ).to( { alpha: 0.0 }, 500, Phaser.Easing.Sinusoidal.InOut, true );
};

NodeTripper.Game.prototype.toggleMute = function()
{
  var mute = !NodeTripper.getMute();

  NodeTripper.setMute( mute );

  var muteText = mute ? "Unmute" : "  Mute";
  var muteButtonStyle = mute ? NodeTripper.buttonActiveStyle : NodeTripper.buttonStyle;

  var muteButtonText = this.muteButton.children[0];
  muteButtonText.text = muteText;
  muteButtonText.setStyle( muteButtonStyle );
};
