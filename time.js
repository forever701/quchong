function getTime(days) {
    const today = new Date();
  
  // 将日期调整为指定天数前或后
  today.setDate(today.getDate() + days);

  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return Number(year + month + day);
}
