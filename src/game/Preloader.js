/** @constructor */
NodeTripper.Preloader = function( game )
{
  this.preloader = null;

  this.soundList = [];
  this.numberOfDecodedSounds = 0;
};

NodeTripper.Preloader.stateKey = "Preloader";

NodeTripper.Preloader.prototype.init = function()
{
  
};

NodeTripper.Preloader.prototype.preload = function()
{
  this.stage.backgroundColor = 0x111111;

  var preloaderWidth = ( this.game.width * 0.67 / 2.0 ) | 0;
  var preloaderHeight = 32;
  var bmd = this.game.add.bitmapData( preloaderWidth, preloaderHeight );
  bmd.ctx.fillStyle = "#999999";
  bmd.ctx.fillRect( 0, 0, preloaderWidth, preloaderHeight );

  this.preloader = this.game.add.sprite( 0, 0, bmd );
  this.preloader.anchor.setTo( 0.5, 0.5 );
  this.preloader.position.setTo( this.world.centerX,
                                 this.world.height - this.preloader.height * 2 );
  this.load.setPreloadSprite( this.preloader );

  this.load.audio( "bell2", "assets/sounds/bell2.wav" );

  this.game.load.spritesheet('dude', 'assets/graphics/dude.png', 32, 48);
};

NodeTripper.Preloader.prototype.create = function()
{
  this.stage.backgroundColor = 0x222222;

  this.numberOfDecodedSounds = 0;

  var bell2 = this.game.add.audio( "bell2" );
  this.soundList.push( bell2 );

  // Apply callback to decoding sounds.
  for( var i = 0; i < this.soundList.length; i++ )
  {
    this.soundList[i].onDecoded.add( this.soundDecoded, this );
  }

  this.sound.setDecodedCallback( this.soundList, this.allSoundsDecoded, this );
};

NodeTripper.Preloader.prototype.soundDecoded = function( audio )
{
  // Start scaling the preloader sprite towards 200% for audio decoding.
  this.numberOfDecodedSounds++;
  this.preloader.scale.set( 1.0 + ( this.numberOfDecodedSounds / this.soundList.length ), 1.0 );
};

NodeTripper.Preloader.prototype.allSoundsDecoded = function()
{
  this.start();
};

NodeTripper.Preloader.prototype.start = function()
{
  // First see if the "state" URL parameter was specified.
  var stateKey = this.game.net.getQueryString( "state" );
  if( typeof stateKey === "string" && stateKey !== "" )
  {
    if( this.state.checkState( stateKey ) )
    {
      // Just straight to this state.
      this.state.start( stateKey );
      return;
    }
    else
    {
      console.warn( stateKey + " is not a valid state key." );
    }
  }

  // Proceed to main menu, as usual.
  this.state.start( NodeTripper.MainMenu.stateKey );
};
