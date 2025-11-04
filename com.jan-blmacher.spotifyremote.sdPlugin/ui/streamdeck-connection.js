/**
 * Manual Stream Deck WebSocket connection
 * This establishes a direct connection to Stream Deck without relying on sdpi-components
 */

let websocket = null;
let pluginUUID = null;
let actionInfo = null;
let isConnected = false;
let messageQueue = [];

// Store callbacks for async responses
let globalSettingsCallback = null;
let settingsCallbacks = {};

// Create a $SD-like API
window.$SD = {
    api: {
        setGlobalSettings: function(uuid, settings) {
            console.log('[SD] setGlobalSettings called:', { uuid, settings });
            sendToStreamDeck('setGlobalSettings', {
                context: uuid,
                payload: settings
            });
        },
        
        getGlobalSettings: function(uuid, callback) {
            console.log('[SD] getGlobalSettings called:', uuid);
            if (callback) {
                globalSettingsCallback = callback;
                console.log('[SD] Stored callback for global settings');
            }
            sendToStreamDeck('getGlobalSettings', {
                context: uuid
            });
        },
        
        setSettings: function(uuid, context, settings) {
            console.log('[SD] setSettings called:', { uuid, context, settings });
            sendToStreamDeck('setSettings', {
                context: context,
                payload: settings
            });
        },
        
        getSettings: function(uuid, context, callback) {
            console.log('[SD] getSettings called:', { uuid, context });
            if (callback) {
                settingsCallbacks[context] = callback;
                console.log('[SD] Stored callback for settings:', context);
            }
            sendToStreamDeck('getSettings', {
                context: context
            });
        },
        
        sendToPlugin: function(uuid, payload) {
            console.log('[SD] sendToPlugin called:', { uuid, payload });
            sendToStreamDeck('sendToPlugin', {
                context: uuid,
                payload: payload
            });
        }
    },
    
    on: function(eventName, callback) {
        console.log('[SD] Registering event listener for:', eventName);
        document.addEventListener(eventName, function(e) {
            callback(e.detail);
        });
    },
    
    // Expose connection and uuid for advanced usage
    get connection() {
        return websocket;
    },
    
    get uuid() {
        return pluginUUID;
    },
    
    pluginUUID: null,
    actionInfo: null
};

function sendToStreamDeck(event, payload) {
    const json = {
        event: event,
        ...payload
    };
    
    console.log('[SD] Sending to Stream Deck:', json);
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(json));
    } else {
        console.warn('[SD] WebSocket not ready, queueing message');
        messageQueue.push(json);
    }
}

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo, inActionInfo) {
    console.log('[SD] Connecting to Stream Deck...');
    console.log('[SD] Port:', inPort);
    console.log('[SD] Plugin UUID:', inPluginUUID);
    console.log('[SD] Register Event:', inRegisterEvent);
    console.log('[SD] Info:', inInfo);
    console.log('[SD] Action Info:', inActionInfo);
    
    pluginUUID = inPluginUUID;
    
    try {
        actionInfo = JSON.parse(inActionInfo);
        window.$SD.actionInfo = actionInfo;
        window.$SD.pluginUUID = pluginUUID;
    } catch (e) {
        console.error('[SD] Failed to parse action info:', e);
    }
    
    websocket = new WebSocket('ws://127.0.0.1:' + inPort);
    
    websocket.onopen = function() {
        console.log('[SD] WebSocket connected!');
        
        // Register the property inspector
        const registerPayload = {
            event: inRegisterEvent,
            uuid: inPluginUUID
        };
        
        console.log('[SD] Registering property inspector:', registerPayload);
        websocket.send(JSON.stringify(registerPayload));
        
        isConnected = true;
        
        // Send any queued messages
        while (messageQueue.length > 0) {
            const msg = messageQueue.shift();
            websocket.send(JSON.stringify(msg));
        }
        
        // Fire connected event
        const connectedEvent = new CustomEvent('connected', {
            detail: {
                actionInfo: actionInfo,
                pluginUUID: pluginUUID
            }
        });
        document.dispatchEvent(connectedEvent);
        
        // Fire sdpiComponentsReady for compatibility
        const readyEvent = new CustomEvent('sdpiComponentsReady', {
            detail: {
                actionInfo: actionInfo,
                pluginUUID: pluginUUID
            }
        });
        document.dispatchEvent(readyEvent);
    };
    
    websocket.onerror = function(error) {
        console.error('[SD] WebSocket error:', error);
    };
    
    websocket.onclose = function() {
        console.log('[SD] WebSocket closed');
        isConnected = false;
    };
    
    websocket.onmessage = function(evt) {
        try {
            const jsonObj = JSON.parse(evt.data);
            console.log('[SD] Received from Stream Deck:', jsonObj);
            
            const event = jsonObj.event;
            
            // Handle callbacks for specific events
            if (event === 'didReceiveGlobalSettings') {
                console.log('[SD] Processing didReceiveGlobalSettings');
                if (globalSettingsCallback) {
                    console.log('[SD] Invoking global settings callback with:', jsonObj.payload?.settings);
                    globalSettingsCallback(jsonObj.payload?.settings || {});
                    // Don't clear the callback - we might need it again
                }
            } else if (event === 'didReceiveSettings') {
                console.log('[SD] Processing didReceiveSettings');
                const context = jsonObj.context;
                if (context && settingsCallbacks[context]) {
                    console.log('[SD] Invoking settings callback for context:', context);
                    settingsCallbacks[context](jsonObj.payload?.settings || {});
                    delete settingsCallbacks[context];
                }
            }
            
            // Fire custom event for each message type
            const customEvent = new CustomEvent(event, {
                detail: jsonObj
            });
            document.dispatchEvent(customEvent);
            
        } catch (e) {
            console.error('[SD] Failed to parse message:', e);
        }
    };
}

// Make connectElgatoStreamDeckSocket available globally
window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocket;

console.log('[SD] Stream Deck connection script loaded');

