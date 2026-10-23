/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { SystemStats } from '../types';

export function useSystemStats(pollIntervalMs: number = 3000) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data: SystemStats = await res.json();

        // Augment with browser battery if available and host doesn't report it
        if (data.battery_percent === null && typeof navigator !== 'undefined' && 'getBattery' in navigator) {
          try {
            const battery: any = await (navigator as any).getBattery();
            data.battery_percent = Math.round(battery.level * 100);
            data.is_charging = battery.charging;
          } catch {}
        }

        setStats(data);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { stats, loading, refetch: fetchStats };
}
