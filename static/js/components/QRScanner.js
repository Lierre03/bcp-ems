// QR Code Scanner Component for Staff Attendance Check-in
window.QRScanner = function QRScanner({ eventId, onCheckIn }) {
  const [scanning, setScanning] = React.useState(false);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [eventData, setEventData] = React.useState(null);
  const [recentCheckins, setRecentCheckins] = React.useState([]);
  const [manualInput, setManualInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [notification, setNotification] = React.useState(null); // { type: 'success' | 'error', message: '', title: '' }
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const scanningRef = React.useRef(false);

  // Auto-dismiss notification after 3 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const NotificationToast = ({ notif }) => {
    if (!notif) return null;
    const isSuccess = notif.type === 'success';
    return (
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-fade-in-down flex items-start gap-3 ${isSuccess ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
          {isSuccess ? '✓' : '✕'}
        </div>
        <div>
          {notif.title && <h4 className="font-bold text-sm mb-1">{notif.title}</h4>}
          <div className="text-sm whitespace-pre-line">{notif.message}</div>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    );
  };

  // Load event data and recent check-ins
  React.useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const response = await fetch(`/api/attendance/event/${eventId}`);
      const data = await response.json();

      if (data.success) {
        setEventData(data);
        setRecentCheckins(data.recent_checkins || []);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    }
  };

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      console.log('Camera access granted, stream:', stream);

      // Set camera active to render the video element
      setCameraActive(true);

      // Wait for the component to re-render with the video element
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('Checking video ref:', videoRef);
      console.log('Video element:', videoRef.current);

      if (videoRef.current) {
        console.log('Setting video source...');
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting playback...');
          videoRef.current.play().then(() => {
            console.log('Video playback started');
            setScanning(true);
            scanningRef.current = true;
            scanQRCode();
          }).catch(err => {
            console.error('Video play error:', err);
            setCameraActive(false); // Reset on error
            alert('Failed to start video playback. Please try again.');
          });
        };

        // Add error handler
        videoRef.current.onerror = (e) => {
          console.error('Video element error:', e);
          setCameraActive(false); // Reset on error
          alert('Video element error. Please refresh the page.');
        };

        console.log('Video element setup complete');
      } else {
        console.error('Video element not found after render');
        setCameraActive(false); // Reset on error
        alert('Video element failed to render. Please refresh the page.');
      }
    } catch (error) {
      console.error('Camera access error:', error);

      let errorMessage = 'Unable to access camera. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera access in your browser and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera access is not supported in this browser.';
      } else if (error.name === 'NotSecureError') {
        errorMessage += 'Camera access requires HTTPS. Please use a secure connection.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
    scanningRef.current = false;
  };

  const scanQRCode = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const tick = () => {
      if (!scanningRef.current || !videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        if (scanningRef.current) requestAnimationFrame(tick);
        return;
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code && code.data) {
          console.log('QR code detected:', code.data);
          scanningRef.current = false;
          processQRCode(code.data);
          return;
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const processQRCode = async (qrCode) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/attendance/check-in/${encodeURIComponent(qrCode)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        // Success notification
        setNotification({
          type: 'success',
          title: 'Check-in successful!',
          message: `${data.participant.name}\nChecked in at ${data.participant.check_in_time}`
        });

        // Update recent check-ins
        loadEventData();

        // Call parent callback if provided
        if (onCheckIn) {
          onCheckIn(data.participant);
        }
      } else {
        // Error notification
        setNotification({
          type: 'error',
          title: 'Check-in failed',
          message: data.error
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setNotification({
        type: 'error',
        title: 'System Error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!manualInput.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter a participant ID, username, or email'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/attendance/manual-check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          event_id: eventId,
          participant_id: manualInput.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setNotification({
          type: 'success',
          title: 'Manual check-in successful!',
          message: `${data.participant.name}\nChecked in at ${data.participant.check_in_time}`
        });

        // Update recent check-ins
        loadEventData();
        setManualInput('');

        if (onCheckIn) {
          onCheckIn(data.participant);
        }
      } else {
        setNotification({
          type: 'error',
          title: 'Manual check-in failed',
          message: data.error
        });
      }
    } catch (error) {
      console.error('Manual check-in error:', error);
      setNotification({
        type: 'error',
        title: 'System Error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <NotificationToast notif={notification} />

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">QR Attendance Scanner</h2>
        {eventData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900">{eventData.event.name}</h3>
            <p className="text-sm text-blue-800">{eventData.event.date}</p>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Registered:</span>
                <span className="font-semibold ml-1">{eventData.attendance.total_registered}</span>
              </div>
              <div>
                <span className="text-blue-600">Checked In:</span>
                <span className="font-semibold ml-1 text-green-600">{eventData.attendance.total_checked_in}</span>
                <span className="text-gray-500 ml-1">
                  ({eventData.attendance.attendance_rate}% attendance rate)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Section */}
      <div className="mb-6">
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {!cameraActive ? (
            <div>
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">Point QR code at camera to scan</p>
              <button
                onClick={startCamera}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Start Camera
              </button>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md mx-auto rounded-lg border border-gray-300"
                style={{ maxHeight: '300px' }}
              />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none"
                style={{
                  top: '20%',
                  left: '20%',
                  right: '20%',
                  bottom: '20%',
                  borderStyle: 'dashed'
                }}>
              </div>
              <div className="absolute top-2 right-2">
                <button
                  onClick={stopCamera}
                  className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {scanning && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 text-blue-600">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Scanning for QR codes...</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Point QR code at the scanning frame above
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Manual Check-in</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter Particpant ID, Username, or Email"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleManualCheckIn}
            disabled={loading || !manualInput.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check In
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Enter participant ID number, username, or email address</p>
      </div>

      {/* Recent Check-ins */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Check-ins</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentCheckins.length > 0 ? (
            recentCheckins.map((checkin, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{checkin.full_name}</span>
                  <span className="text-sm text-gray-500 ml-2">({checkin.username})</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{checkin.check_in_time}</div>
                  <div className="text-xs text-gray-500">{checkin.check_in_method}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              No check-ins yet
            </div>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={() => window.open(`/api/attendance/event/${eventId}/full-report`, '_blank')}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          📊 View Full Report
        </button>
        <button
          onClick={() => console.log('CSV export functionality would be implemented here')}
          className="text-green-600 hover:text-green-800 text-sm font-medium"
        >
          📥 Export CSV
        </button>
      </div>
    </div>
  );
};
