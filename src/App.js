import React from 'react';
import './RNGSimulator.css';

function App() {
  return (
    <div className="App">
      <RNGSimulator />
    </div>
  );
}

const RNGSimulator = () => {
  // Game state
  const [coins, setCoins] = React.useState(0);
  const [target, setTarget] = React.useState('');
  const [currentRange, setCurrentRange] = React.useState({ min: 0, max: 0 });
  const [rollHistory, setRollHistory] = React.useState([]);
  const [isAutoClicking, setIsAutoClicking] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('game');
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  
  // Statistics state
  const [stats, setStats] = React.useState({
    startTime: Date.now(),
    manualClicks: 0,
    autoClicks: 0,
    totalCoinsEarned: 0,
    upgradesPurchased: 0,
    totalHits: 0,
    totalNumbersGenerated: 0
  });

  // Upgrades state - rebalanced
  const [upgrades, setUpgrades] = React.useState({
    multiInstance: { level: 1, cost: 25 },
    autoClicker: { level: 0, cost: 100 },
    coinMultiplier: { level: 1, cost: 50 }, // Now increases by 0.1 each level
    speedBurst: { level: 1, cost: 75 }
  });

  // Initialize from localStorage
  React.useEffect(() => {
    const savedState = localStorage.getItem('rngSimulator');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setCoins(parsed.coins || 0);
      setTarget(parsed.target || '');
      setRollHistory(parsed.rollHistory || []);
      setUpgrades(parsed.upgrades || upgrades);
      setStats(parsed.stats || stats);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to localStorage whenever state changes
  React.useEffect(() => {
    const gameState = {
      coins,
      target,
      rollHistory,
      upgrades,
      stats
    };
    localStorage.setItem('rngSimulator', JSON.stringify(gameState));
  }, [coins, target, rollHistory, upgrades, stats]);

  // Update range when target changes
  React.useEffect(() => {
    if (target && !isNaN(target)) {
      const digits = target.length;
      const min = 0;
      const max = Math.pow(10, digits) - 1;
      setCurrentRange({ min, max });
    }
  }, [target]);

  // Calculate base reward based on range size - rebalanced
  const calculateBaseReward = React.useCallback(() => {
    if (!target) return 0;
    const digits = target.length;
    
    // Much lower base rewards to balance coin multiplier
    const baseRewards = {
      1: 2,   // 0-9: 2 coins (was 5)
      2: 10,  // 0-99: 10 coins (was 50)
      3: 50,  // 0-999: 50 coins (was 500)
      4: 200, // 0-9999: 200 coins (was 2000)
      5: 800, // 0-99999: 800 coins (was 10000)
    };
    
    return baseRewards[digits] || Math.floor(Math.pow(10, digits) * 0.1);
  }, [target]);

  // Generate cryptographically secure random number
  const generateRandomNumber = React.useCallback(() => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const randomValue = array[0] / (0xFFFFFFFF + 1);
    return Math.floor(randomValue * (currentRange.max - currentRange.min + 1)) + currentRange.min;
  }, [currentRange]);

  // Handle manual click
  const handleClick = React.useCallback(() => {
    if (!target || isNaN(target)) return;

    const targetNum = parseInt(target);
    const instances = upgrades.multiInstance.level;
    const results = [];
    let coinsEarned = 0;
    let hitsThisRoll = 0;

    for (let i = 0; i < instances; i++) {
      const generated = generateRandomNumber();
      const isMatch = generated === targetNum;
      
      let reward = 0;
      if (isMatch) {
        // Coin multiplier now increases by 0.1 each level, so level 1 = 1.1x, level 2 = 1.2x, etc.
        const multiplier = 1 + (upgrades.coinMultiplier.level * 0.1);
        reward = Math.floor(calculateBaseReward() * multiplier);
        coinsEarned += reward;
        hitsThisRoll++;
      }

      results.push({
        number: generated,
        isMatch,
        reward,
        timestamp: Date.now()
      });
    }

    setCoins(prev => prev + coinsEarned);
    setStats(prev => ({
      ...prev,
      manualClicks: prev.manualClicks + 1,
      totalCoinsEarned: prev.totalCoinsEarned + coinsEarned,
      totalHits: prev.totalHits + hitsThisRoll,
      totalNumbersGenerated: prev.totalNumbersGenerated + instances
    }));

    // Group this click's results together
    const groupedResults = {
      id: Date.now(),
      rolls: results,
      totalCoins: coinsEarned,
      hits: hitsThisRoll,
      instances: instances
    };

    setRollHistory(prev => [groupedResults, ...prev].slice(0, 20));
  }, [target, upgrades, generateRandomNumber, calculateBaseReward]);

  // Handle auto click (separate from manual for stats)
  const handleAutoClick = React.useCallback(() => {
    if (!target || isNaN(target)) return;

    const targetNum = parseInt(target);
    const instances = upgrades.multiInstance.level;
    const results = [];
    let coinsEarned = 0;
    let hitsThisRoll = 0;

    for (let i = 0; i < instances; i++) {
      const generated = generateRandomNumber();
      const isMatch = generated === targetNum;
      
      let reward = 0;
      if (isMatch) {
        const multiplier = 1 + (upgrades.coinMultiplier.level * 0.1);
        reward = Math.floor(calculateBaseReward() * multiplier);
        coinsEarned += reward;
        hitsThisRoll++;
      }

      results.push({
        number: generated,
        isMatch,
        reward,
        timestamp: Date.now()
      });
    }

    setCoins(prev => prev + coinsEarned);
    setStats(prev => ({
      ...prev,
      autoClicks: prev.autoClicks + 1,
      totalCoinsEarned: prev.totalCoinsEarned + coinsEarned,
      totalHits: prev.totalHits + hitsThisRoll,
      totalNumbersGenerated: prev.totalNumbersGenerated + instances
    }));

    const groupedResults = {
      id: Date.now(),
      rolls: results,
      totalCoins: coinsEarned,
      hits: hitsThisRoll,
      instances: instances,
      isAuto: true
    };

    setRollHistory(prev => [groupedResults, ...prev].slice(0, 20));
  }, [target, upgrades, generateRandomNumber, calculateBaseReward]);

  // Handle speed burst
  const handleSpeedBurst = React.useCallback(() => {
    if (!target || isNaN(target)) return;

    const burstCost = Math.max(20, Math.floor(calculateBaseReward() * 0.2));
    if (coins < burstCost) return;

    setCoins(prev => prev - burstCost);

    const burstCount = 8 + (upgrades.speedBurst.level - 1) * 3; // Fewer bursts
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => handleClick(), i * 50);
    }
  }, [target, coins, upgrades.speedBurst.level, calculateBaseReward, handleClick]);

  // Buy upgrade
  const buyUpgrade = React.useCallback((upgradeType) => {
    const upgrade = upgrades[upgradeType];
    if (coins >= upgrade.cost) {
      setCoins(prev => prev - upgrade.cost);
      setUpgrades(prev => ({
        ...prev,
        [upgradeType]: {
          level: upgrade.level + 1,
          cost: Math.floor(upgrade.cost * 2.1) // Higher cost scaling
        }
      }));
      setStats(prev => ({
        ...prev,
        upgradesPurchased: prev.upgradesPurchased + 1
      }));
    }
  }, [coins, upgrades]);

  // Toggle auto-clicker
  const toggleAutoClicker = React.useCallback(() => {
    if (upgrades.autoClicker.level > 0) {
      setIsAutoClicking(prev => !prev);
    }
  }, [upgrades.autoClicker.level]);

  // Auto-clicker functionality
  React.useEffect(() => {
    if (isAutoClicking && upgrades.autoClicker.level > 0) {
      const interval = setInterval(() => {
        handleAutoClick();
      }, 1000 / (upgrades.autoClicker.level * 0.3)); // Slower auto-clicker
      return () => clearInterval(interval);
    }
  }, [isAutoClicking, upgrades.autoClicker.level, handleAutoClick]);

  // Update current time every second for real-time display
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Format time played with real-time updates
  const formatTimePlayed = React.useCallback(() => {
    const seconds = Math.floor((currentTime - stats.startTime) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, [currentTime, stats.startTime]);

  // Format number with leading zeros
  const formatNumber = React.useCallback((num) => {
    if (!target) return num.toString();
    return num.toString().padStart(target.length, '0');
  }, [target]);

  // Calculate hit rate
  const calculateHitRate = React.useCallback(() => {
    if (stats.totalNumbersGenerated === 0) return 0;
    return ((stats.totalHits / stats.totalNumbersGenerated) * 100).toFixed(2);
  }, [stats]);

  // Render statistics tab
  const renderStatistics = () => (
    <div className="statistics-section card">
      <h2>All-Time Statistics</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <h3>Time Played</h3>
          <p>{formatTimePlayed()}</p>
        </div>
        <div className="stat-item">
          <h3>Total Clicks</h3>
          <p>{stats.manualClicks + stats.autoClicks}</p>
        </div>
        <div className="stat-item">
          <h3>Manual Clicks</h3>
          <p>{stats.manualClicks}</p>
        </div>
        <div className="stat-item">
          <h3>Auto Clicks</h3>
          <p>{stats.autoClicks}</p>
        </div>
        <div className="stat-item">
          <h3>Total Numbers Generated</h3>
          <p>{stats.totalNumbersGenerated.toLocaleString()}</p>
        </div>
        <div className="stat-item">
          <h3>Total Hits</h3>
          <p>{stats.totalHits.toLocaleString()}</p>
        </div>
        <div className="stat-item">
          <h3>Hit Rate</h3>
          <p>{calculateHitRate()}%</p>
        </div>
        <div className="stat-item">
          <h3>Total Coins Earned</h3>
          <p>{stats.totalCoinsEarned.toLocaleString()}</p>
        </div>
        <div className="stat-item">
          <h3>Upgrades Purchased</h3>
          <p>{stats.upgradesPurchased}</p>
        </div>
        <div className="stat-item">
          <h3>Current Coins</h3>
          <p>{coins.toLocaleString()}</p>
        </div>
        <div className="stat-item">
          <h3>Largest Reward</h3>
          <p>{Math.max(...rollHistory.flatMap(group => group.rolls.map(roll => roll.reward)), 0).toLocaleString()} coins</p>
        </div>
        <div className="stat-item">
          <h3>Best Hit Streak</h3>
          <p>{
            Math.max(...rollHistory.reduce((streaks, group) => {
              const currentStreak = streaks[streaks.length - 1] || 0;
              if (group.hits > 0) {
                streaks[streaks.length - 1] = (currentStreak || 0) + group.hits;
              } else {
                streaks.push(0);
              }
              return streaks;
            }, [0])) || 0
          }</p>
        </div>
      </div>
    </div>
  );

  // Render game tab
  const renderGame = () => (
    <>
      {/* Target Input Section */}
      <div className="target-section card">
        <h2>Set Target Number</h2>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter target number..."
          className="target-input"
        />
        {target && (
          <div className="range-info">
            Range: {formatNumber(currentRange.min)} - {formatNumber(currentRange.max)}
            <br />
            Base Reward: {calculateBaseReward()} coins
            <br />
            Chance: 1 in {currentRange.max - currentRange.min + 1}
          </div>
        )}
      </div>

      {/* Control Section */}
      <div className="control-section card">
        <button
          onClick={handleClick}
          className="click-button"
          disabled={!target}
        >
          Generate Numbers ({upgrades.multiInstance.level}x)
        </button>

        <button
          onClick={handleSpeedBurst}
          className="speed-burst-button"
          disabled={!target || coins < Math.max(20, Math.floor(calculateBaseReward() * 0.2))}
        >
          Speed Burst (Lvl {upgrades.speedBurst.level})
          <br />
          <small>Cost: {Math.max(20, Math.floor(calculateBaseReward() * 0.2))} coins</small>
        </button>

        <button
          onClick={toggleAutoClicker}
          className={`auto-clicker-button ${isAutoClicking ? 'active' : ''}`}
          disabled={upgrades.autoClicker.level === 0}
        >
          Auto-Clicker: {isAutoClicking ? 'ON' : 'OFF'} (Lvl {upgrades.autoClicker.level})
        </button>
      </div>

      {/* Upgrades Shop */}
      <div className="upgrades-section card">
        <h2>Upgrades Shop</h2>
        <div className="upgrades-grid">
          <div className="upgrade-item">
            <h3>Multi-Instance</h3>
            <p>Level: {upgrades.multiInstance.level}</p>
            <p>Numbers per click: {upgrades.multiInstance.level}</p>
            <button
              onClick={() => buyUpgrade('multiInstance')}
              disabled={coins < upgrades.multiInstance.cost}
            >
              Buy - {upgrades.multiInstance.cost} coins
            </button>
          </div>

          <div className="upgrade-item">
            <h3>Auto-Clicker</h3>
            <p>Level: {upgrades.autoClicker.level}</p>
            <p>Speed: {(upgrades.autoClicker.level * 0.3).toFixed(1)}/sec</p>
            <button
              onClick={() => buyUpgrade('autoClicker')}
              disabled={coins < upgrades.autoClicker.cost}
            >
              Buy - {upgrades.autoClicker.cost} coins
            </button>
          </div>

          <div className="upgrade-item">
            <h3>Coin Multiplier</h3>
            <p>Level: {upgrades.coinMultiplier.level}</p>
            <p>Multiplier: {1 + (upgrades.coinMultiplier.level * 0.1)}x</p>
            <button
              onClick={() => buyUpgrade('coinMultiplier')}
              disabled={coins < upgrades.coinMultiplier.cost}
            >
              Buy - {upgrades.coinMultiplier.cost} coins
            </button>
          </div>

          <div className="upgrade-item">
            <h3>Speed Burst</h3>
            <p>Level: {upgrades.speedBurst.level}</p>
            <p>Clicks: {8 + (upgrades.speedBurst.level - 1) * 3}</p>
            <button
              onClick={() => buyUpgrade('speedBurst')}
              disabled={coins < upgrades.speedBurst.cost}
            >
              Buy - {upgrades.speedBurst.cost} coins
            </button>
          </div>
        </div>
      </div>

      {/* Roll History */}
      <div className="history-section card">
        <h2>Recent Rolls</h2>
        <div className="roll-history">
          {rollHistory.map((group, index) => (
            <div key={group.id} className="roll-group">
              <div className="roll-group-header">
                <small>
                  {new Date(group.timestamp || group.id).toLocaleTimeString()}
                  {group.isAuto && ' (Auto)'}
                </small>
                <div>
                  {group.hits > 0 && (
                    <span className="hits-counter">{group.hits} hit{group.hits !== 1 ? 's' : ''}</span>
                  )}
                  {group.totalCoins > 0 && (
                    <span className="roll-group-total">+{group.totalCoins} coins</span>
                  )}
                </div>
              </div>
              <div className="multi-roll-container">
                {group.rolls.map((roll, rollIndex) => (
                  <div
                    key={rollIndex}
                    className={`single-roll-item ${roll.isMatch ? 'match' : ''}`}
                  >
                    <span className="roll-number">{formatNumber(roll.number)}</span>
                    {roll.isMatch && (
                      <span className="reward-badge">+{roll.reward}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {rollHistory.length === 0 && (
            <div className="empty-history">No rolls yet. Start generating numbers!</div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="rng-simulator">
      <div className="game-header">
        <h1>RNG Simulator</h1>
        <div className="coin-display">
          <span className="coin-count">{coins} coins</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-section">
        <button 
          className={`tab-button ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          Game
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      <div className="game-container">
        {activeTab === 'game' ? renderGame() : renderStatistics()}
      </div>
    </div>
  );
};

export default App;
