// SleepTracker.jsx
import React, { useState } from "react";
import API from "../../api";
import useDataCache from "../../hooks/useDataCache";
import SleepChart from "../chart/SleepChart";
import SleepForm from "../chart/SleepForm";
import "../../styles/SleepTracker.css";

const SleepTracker = () => {
  // 本地UI状态
  const [showForm, setShowForm] = useState(false);

  // 使用 useDataCache 获取睡眠数据
  const { data: sleepData, loading: loadingSleep, refresh } = useDataCache(
    `sleep-data-${user?.uid}`,
    async () => {
      const res = await API.get("/api/sleep/me");
      return res.data;
    }
  );

  // 使用 useDataCache 获取睡眠建议
  const { data: sleepAdvice, loading: loadingAdvice } = useDataCache(
    `sleep-advice-${user?.uid}`,
    async () => {
      const res = await API.get("/api/sleep/advice");
      return res.data;
    }
  );

  // 处理睡眠记录删除
  const handleDelete = async (id) => {
    try {
      await API.delete(`/api/sleep/${id}`);
      // 触发数据刷新
      refresh();
    } catch (error) {
      console.error("Error deleting sleep record:", error);
      alert("Failed to delete sleep record");
    }
  };

  if (loadingSleep || loadingAdvice) {
    return <div>Loading...</div>;
  }

  return (
    <div className="sleep-tracker">
      {showForm ? (
        <SleepForm onSuccess={() => {
          setShowForm(false);
          refresh();
        }} />
      ) : (
        <>
          <button onClick={() => setShowForm(true)}>Add Sleep Record</button>
          <SleepChart data={sleepData} onDelete={handleDelete} />
        </>
      )}
    </div>
  );
};

export default SleepTracker;
