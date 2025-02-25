import React, { useState, useEffect } from 'react';

const Notification = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-info-circle';
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className="notification-wrapper">
      <div className={`notification ${type}`}>
        <i className={getIcon()} style={{ marginRight: '8px', fontSize: '16px' }}></i>
        <span>{message}</span>
        <span 
          onClick={handleClose}
          style={{ cursor: 'pointer', fontSize: '16px', marginLeft: '10px' }}
        >
          ×
        </span>
      </div>
    </div>
  );
};

export const NotificationContainer = ({ notifications, onClose }) => {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={() => onClose(notification.id)}
        />
      ))}
    </div>
  );
};

export default Notification; 