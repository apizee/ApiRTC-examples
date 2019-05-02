$(function() {
    'use strict';
    apiRTC.setLogLevel(10);
    var screensharingStream = null;
    var connectedConversation = null;

    /**
     * Create and join a new conference
     * @author Apizee
     *
     * @param {string} name - Conference name
     * @return void
     */
    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';
        var connectedSession = null;

        var localStream = null;
        var subscribedStreams = {};

        //==============================
        // 1/ CREATE USER AGENT
        //==============================
        var ua = new apiRTC.UserAgent({
            uri: 'apzkey:myDemoApiKey'
        });

        //==============================
        // 2/ CREATE LOCAL STREAM
        //==============================
        ua.createStream()
            .then(function (stream) {
                // Save local stream
                localStream = stream;

                // Get media container
                var container = document.getElementById('local-container');

                // Create media element
                var mediaElement = document.createElement('video');
                mediaElement.id = 'local-media';
                mediaElement.autoplay = true;
                mediaElement.muted = true;

                // Add media element to media container
                container.appendChild(mediaElement);

                // Attach stream
                localStream.attachToElement(mediaElement);
            }).catch(function (err) {
                console.error('create stream error', err);
            });

        //==============================
        // 3/ REGISTER
        //==============================
        ua.register({
            cloudUrl: cloudUrl
        }).then(function(session) {
            // Save session
            connectedSession = session;

            //==============================
            // 4/ CREATE CONVERSATION
            //==============================
            connectedConversation = connectedSession.getConversation(name);

            //==============================
            // 5/ JOIN CONVERSATION
            //==============================
            connectedConversation.join()
                .then(function(response) {
                    //==============================
                    // 6/ PUBLISH OWN STREAM
                    //==============================
                    connectedConversation.publish(localStream, null);

                    //==========================================================
                    // 7/ WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
                    //==========================================================
                    connectedConversation.on('availableStreamsUpdated', function(streams) {
                        var keys = Object.keys(streams);

                        for (var i = 0, len = keys.length; i < len; i++) {
                            if (typeof subscribedStreams[keys[i]] === 'undefined') {
                                //==============================
                                // 8/ SUBSCRIBE TO STREAM
                                //==============================
                                subscribedStreams[keys[i]] = streams[keys[i]];
                                connectedConversation.subscribeToMedia(keys[i]);
                            }
                        }
                    });

                    //==========================================================
                    // 8/ WHEN NEW STREAM IS ADDED TO CONVERSATION
                    //==========================================================
                    connectedConversation.on('streamAdded', function(stream) {
                        // Get remote media container
                        var container = document.getElementById('remote-container');

                        // Create media element
                        var mediaElement = document.createElement('video');
                        mediaElement.id = 'remote-media-' + stream.streamId;
                        mediaElement.autoplay = true;
                        mediaElement.muted = false;

                        // Add media element to media container
                        container.appendChild(mediaElement);

                        // Attach stream
                        stream.attachToElement(mediaElement);
                    });

                });

                //=====================================================
                // 9/ WHEN STREAM WAS REMOVED FROM THE CONVERSATION
                //=====================================================
                connectedConversation.on('streamRemoved', function(streamInfos) {
                    document.getElementById('remote-media-' + streamInfos.streamId).remove();
                });
        });
    }

    //==============================
    // CREATE CONFERENCE
    //==============================
    $('#create').on('submit', function(e) {
        e.preventDefault();

        // Get conference name
        var conferenceName = document.getElementById('conference-name').value;

        document.getElementById('create').style.display = 'none';
        document.getElementById('conference').style.display = 'inline-block';
        document.getElementById('title').innerHTML = 'You are in conference: ' + conferenceName;

        // Join conference
        joinConference(conferenceName);
    });

    //==============================
    // SCREENSHARING FEATURE
    //==============================
    $('#toggle-screensharing').on('click', function() {
        if (screensharingStream === null) {
            var captureSourceType = [];
            if (apiRTC.browser === 'Firefox') {
                captureSourceType = "screen";
            } else {
                //Chrome
                captureSourceType = ["screen", "window", "tab", "audio"];
            }

            apiRTC.Stream.createScreensharingStream(captureSourceType)
                .then(function(stream) {

                    stream.on('stopped', function() {
                        //Used to detect when user stop the screenSharing with Chrome DesktopCapture UI
                        console.log("stopped event on stream");
                        document.getElementById('local-screensharing').remove();
                        screensharingStream = null;
                    });

                    screensharingStream = stream;
                    connectedConversation.publish(screensharingStream);
                    // Get media container
                    var container = document.getElementById('local-container');

                    // Create media element
                    var mediaElement = document.createElement('video');
                    mediaElement.id = 'local-screensharing';
                    mediaElement.autoplay = true;
                    mediaElement.muted = true;

                    // Add media element to media container
                    container.appendChild(mediaElement);

                    // Attach stream
                    screensharingStream.attachToElement(mediaElement);

                })
                .catch(function(err) {
                    console.error('Could not create screensharing stream :', err);
                });
        } else {
            connectedConversation.unpublish(screensharingStream);
            screensharingStream.release();
            screensharingStream = null;
            document.getElementById('local-screensharing').remove();
        }
    });
});