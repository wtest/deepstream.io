var SocketMock = require( '../mocks/socket-mock' ),
	SocketWrapper = require( '../../src/message/socket-wrapper' ),
	permissionHandlerMock = require( '../mocks/permission-handler-mock' ),
	MessageProcessor = require( '../../src/message/message-processor' ),
	_msg = require( '../test-helper/test-helper' ).msg,
	messageProcessor,
	lastAuthenticatedMessage = null;

describe( 'the message processor only forwards valid, authorized messages', function(){
	
	it( 'creates the message processor', function(){
		messageProcessor = new MessageProcessor({ 
			permissionHandler: permissionHandlerMock,
			logger: { log: function(){} }
		});
		messageProcessor.onAuthenticatedMessage = function( socketWrapper, message ) {
			lastAuthenticatedMessage = message;
		};
	});

	it( 'rejects invalid messages', function(){
		var socketWrapper = new SocketWrapper( new SocketMock(), {} );
		messageProcessor.process( socketWrapper, 'gibberish' );
		expect( socketWrapper.socket.lastSendMessage ).toBe( _msg( 'X|E|MESSAGE_PARSE_ERROR|gibberish+' ) );
	});

	it( 'handles permission errors', function(){
		var socketWrapper = new SocketWrapper( new SocketMock(), {} );
		permissionHandlerMock.nextCanPerformActionResult = 'someError';
		messageProcessor.process( socketWrapper, _msg( 'R|R|/user/wolfram+' ) );
		expect( socketWrapper.socket.lastSendMessage ).toBe( _msg( 'R|E|MESSAGE_PERMISSION_ERROR|someError+' ) );
	});

	it( 'handles denied messages', function(){
		var socketWrapper = new SocketWrapper( new SocketMock(), {} );
		permissionHandlerMock.nextCanPerformActionResult = false;
		messageProcessor.process( socketWrapper, _msg( 'R|R|/user/wolfram+' ) );
		expect( socketWrapper.socket.lastSendMessage ).toBe( _msg( 'R|E|MESSAGE_DENIED|R|R|/user/wolfram+' ) );
	});

	it( 'provides the correct arguments to canPerformAction', function(){
		var socketWrapper = new SocketWrapper( new SocketMock(), {} );
		socketWrapper.user = 'someUser';
		permissionHandlerMock.nextCanPerformActionResult = false;
		messageProcessor.process( socketWrapper, _msg( 'R|R|/user/wolfram+' ) );
		expect( permissionHandlerMock.lastCanPerformActionQueryArgs.length ).toBe( 3 );
		expect( permissionHandlerMock.lastCanPerformActionQueryArgs[ 0 ] ).toBe( 'someUser' );
		expect( permissionHandlerMock.lastCanPerformActionQueryArgs[ 1 ].data[ 0 ] ).toBe( '/user/wolfram' );
	});

	it( 'forwards validated and permissioned messages', function(){
		var socketWrapper = new SocketWrapper( new SocketMock(), {} );
		socketWrapper.user = 'someUser';
		permissionHandlerMock.nextCanPerformActionResult = true;
		expect( lastAuthenticatedMessage ).toBe( null );
		messageProcessor.process( socketWrapper, _msg( 'R|R|/user/wolfram+' ) );
		expect( lastAuthenticatedMessage.raw ).toBe( _msg( 'R|R|/user/wolfram' ) );
	});
});