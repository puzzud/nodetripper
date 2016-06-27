/** @constructor */
NodeTripper.Boot = function( game )
{
  
};

NodeTripper.Boot.stateKey = "Boot";

NodeTripper.Boot.prototype.init = function()
{
  this.stage.disableVisibilityChange = false;
  this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
  this.scale.minWidth = ( this.screenWidth / 2 ) | 0;
  this.scale.minHeight = ( this.screenHeight / 2 ) | 0;
  this.scale.pageAlignHorizontally = true;
  this.scale.pageAlignVertically = true;
  this.stage.forcePortrait = true;

  this.input.maxPointers = 1;
  this.input.addPointer();

  this.stage.backgroundColor = 0x000000;

  this.game.input.gamepad.start();
  NodeTripper.gamepadList.push( this.game.input.gamepad.pad1 );
  NodeTripper.gamepadList.push( this.game.input.gamepad.pad2 );
  NodeTripper.gamepadList.push( this.game.input.gamepad.pad3 );
  NodeTripper.gamepadList.push( this.game.input.gamepad.pad4 );
};

NodeTripper.Boot.prototype.preload = function()
{
  this.game.load.json( "projectInfo", "package.json", true );
};

NodeTripper.Boot.prototype.create = function()
{
  NodeTripper.projectInfo = this.game.cache.getJSON( "projectInfo" );

  this.processSettings();

  this.state.start( NodeTripper.Preloader.stateKey );
};

NodeTripper.Boot.prototype.processSettings = function()
{
  NodeTripper.retrieveLocalSettings();

  this.processContributorList();
};

NodeTripper.Boot.prototype.processContributorList = function()
{
  if( NodeTripper.projectInfo === null ||
      NodeTripper.projectInfo.contributors === undefined )
  {
    return;
  }

  var contributorList = NodeTripper.projectInfo.contributors;
  contributorList.sort( this.contributorComparator );
};

NodeTripper.Boot.prototype.contributorComparator = function( a, b )
{
  // Sort contributor list by last name, first name, and then contribution.
  
  // Pull first and last names from full name.
  var aContributorName = a.name.split( " ", 2 );
  var bContributorName = b.name.split( " ", 2 );
  
  var aLastName = ( aContributorName[1] === undefined ) ? "" : aContributorName[1];
  var bLastName = ( bContributorName[1] === undefined ) ? "" : bContributorName[1];

  var comparison = strcmp( aLastName, bLastName );
  if( comparison === 0 )
  {
    var aFirstName = ( aContributorName[0] === undefined ) ? "" : aContributorName[0];
    var bFirstName = ( bContributorName[0] === undefined ) ? "" : bContributorName[0];
  
    comparison = strcmp( aFirstName, bFirstName );
    if( comparison === 0 )
    {
      comparison = strcmp( a.contribution, b.contribution );
    }
  }

  return comparison;
};
