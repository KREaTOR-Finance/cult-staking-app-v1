import React, { useState, useEffect } from 'react';
import { useXRPL } from '../hooks/useXRPL';
import './NetworkStatus.css';

const NetworkStatus = () => {
    const { isConnected, nodesStatus, checkNodesHealth } = useXRPL();
    const [isExpanded, setIsExpanded] = useState(false);
    const [lastChecked, setLastChecked] = useState(null);

    // Check nodes health automatically and on demand
    useEffect(() => {
        // Set initial last checked time
        setLastChecked(new Date());
        
        // Check health every 10 minutes
        const interval = setInterval(() => {
            checkNodesHealth().then(() => {
                setLastChecked(new Date());
            });
        }, 10 * 60 * 1000); // 10 minutes
        
        return () => clearInterval(interval);
    }, [checkNodesHealth]);

    const handleRefresh = () => {
        checkNodesHealth().then(() => {
            setLastChecked(new Date());
        });
    };

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
        
        // If expanding, check the health status
        if (!isExpanded) {
            handleRefresh();
        }
    };
    
    // Count available nodes
    const getNodeStats = () => {
        if (!nodesStatus) return { available: 0, total: 0 };
        
        const available = Object.values(nodesStatus).filter(
            node => node.status === 'available'
        ).length;
        
        return {
            available,
            total: Object.keys(nodesStatus).length
        };
    };
    
    const stats = getNodeStats();
    const statusClass = isConnected ? 'connected' : 'disconnected';
    
    // Format date
    const formatTime = (date) => {
        if (!date) return 'Never';
        
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="network-status-container">
            <div className={`network-status ${statusClass}`} onClick={toggleExpanded}>
                <div className="status-indicator"></div>
                <div className="status-text">
                    <span>XRPL Network: {isConnected ? 'Connected' : 'Disconnected'}</span>
                    <span className="nodes-info">
                        {stats.available}/{stats.total} nodes available
                    </span>
                </div>
                <button className="expand-button" onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded();
                }}>
                    {isExpanded ? '▲' : '▼'}
                </button>
            </div>
            
            {isExpanded && (
                <div className="network-details">
                    <div className="details-header">
                        <h3>XRPL Nodes Status</h3>
                        <div className="refresh-section">
                            <span>Last checked: {formatTime(lastChecked)}</span>
                            <button className="refresh-button" onClick={handleRefresh}>
                                Refresh
                            </button>
                        </div>
                    </div>
                    
                    <div className="nodes-list">
                        {nodesStatus ? (
                            Object.entries(nodesStatus).map(([nodeUrl, status]) => (
                                <div 
                                    key={nodeUrl} 
                                    className={`node-item ${status.status}`}
                                >
                                    <div className="node-name">
                                        {nodeUrl}
                                    </div>
                                    <div className="node-status">
                                        {status.status === 'available' ? (
                                            <>
                                                <span className="available-dot"></span>
                                                <span>Available ({status.connectionTime})</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="unavailable-dot"></span>
                                                <span>Unavailable</span>
                                                <span className="error-details">
                                                    {status.error}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="loading-nodes">
                                Loading node status...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkStatus; 