function getTime() {
    // 创建一个新的 Date 对象实例
    const today = new Date();

    // 获取年份
    const year = String(today.getFullYear());

    // 获取月份（注意：返回值从 0 开始计数，所以需要加上 1）
    const month = String(today.getMonth() + 1).padStart(2, "0");

    // 获取日期
    const day = String(today.getDate()).padStart(2, "0");
    return Number(year + month + day)
}

module.exports = {
    getTime
}