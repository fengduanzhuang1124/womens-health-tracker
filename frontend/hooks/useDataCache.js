// src/hooks/useDataCache.js
import { useState, useEffect } from 'react';

const useDataCache = (key, fetchFn, options = { ttl: 5 * 60 * 1000 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await fetchFn();
      setData(result);
      // 更新缓存
      localStorage.setItem(key, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
      setError(null);
    } catch (err) {
      console.error(`Error fetching data for ${key}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      // 尝试从缓存加载
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          // 如果缓存未过期，使用缓存数据
          if (Date.now() - timestamp < options.ttl) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing cached data:', e);
        }
      }
      // 缓存不存在或已过期，重新获取数据
      await fetchData();
    };

    loadData();
  }, [key]);

  // 提供手动刷新方法
  const refresh = () => fetchData();

  return { data, loading, error, refresh };
};

export default useDataCache;