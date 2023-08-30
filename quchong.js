const express = require('express');
const cors = require('cors');
var mysql = require('mysql2/promise');
const time = require('./common/time')
const bodyParser = require('body-parser');

// 创建与数据库连接的池子
var pool = mysql.createPool({
    port: 3306, //mysql端口
    user: 'quchong', //mysql用户名
    password: '123456', //mysql密码
    database: 'quchong', //mysql数据库
});

// 创建Express应用程序
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 定义路由处理程序
app.post('/api/quchong', async (req, res) => {
    const { content, filename } = req.body;
    const newUniqueArray = JSON.parse(content);
    let connection;
    try {
        connection = await pool.getConnection();
        //优先查询当天文件是否已经上传过
        const day = time.getTime();
        const [files] = await connection.query(`SELECT * FROM files WHERE day="${day}"`);
        let count = 0;
        let file_name = [];
        if (files[0]) {
            count = files[0].count + 1;
            file_name = JSON.parse(files[0].file_name);
            if (file_name.includes(filename)) {
                return res.json({ msg: '该文件今日已上传去重' });
            } else {
                file_name.push(filename);
            }
        } else {
            await connection.query('INSERT INTO files (day,file_name,count) VALUES (?,?,?)', [day, JSON.stringify([filename]), 0]);
        }
        const type = Number(String(day) + count);
        // 查询数据库获取所有手机号
        const [rows] = await connection.query('SELECT * FROM phones');
        // 将数据库中已有的手机号放入一个 Set 集合以进行快速查找
        const existingPhones = rows.map(row => row.phone);

        // 进行去重操作，并过滤出不在数据库存在的新号码
        let newUniquePhones = newUniqueArray;
        const existingPhoneStrings = Array.from(existingPhones).map(String);
        if (existingPhones[0]) {
            newUniquePhones = newUniqueArray.filter(phone => !existingPhoneStrings.includes(phone));
        }
        if (!newUniquePhones[0]) {
            return res.json({ error: 'Success' });
        }
        if (count > 0) {
            await connection.query('UPDATE files SET count = ? , file_name = ? WHERE day = ?', [count, JSON.stringify(file_name), day]);
        }
        // 将不在数据库中存在的新号码插入到 phones 表中（每个号码为一条数据）
        for (const phone of newUniquePhones) {
            await connection.query('INSERT INTO phones (phone,type) VALUES (?,?)', [phone, type]);
        }

        return res.json({ data: newUniquePhones, error: 'Success' });

    } catch (error) {
        if (connection) {
            return res.status(500).json({ error: 'Failed to fetch data from database' });
        }
        else {
            return res.status(500).json({ error: 'Failed to connection to database' });
        };

    } finally {
        if (connection) {
            connection.release()
        }
    }
});

app.get('/api/getfiles', async (req, res) => {
    const firsttime = Number(req.query.f);
    const lasttime = Number(req.query.l);
    let connection;
    try {
        connection = await pool.getConnection();
        const [files] = await connection.query('SELECT * FROM files WHERE day BETWEEN ? AND ?;', [firsttime, lasttime]);
        return res.status(200).json({ list: files });
    } catch (error) {
        if (connection) {
            return res.status(500).json({ error: 'Failed to fetch data from database' });
        }
        else {
            return res.status(500).json({ error: 'Failed to connection to database' });
        };

    } finally {
        if (connection) {
            connection.release()
        }
    }
})

app.get('/api/download', async (req, res) => {
    const type = Number(req.query.t);
    let connection;
    try {
        connection = await pool.getConnection();
        const [phones] = await connection.query('SELECT phone FROM phones WHERE type = ?', [type]);
        const existingPhones = phones.map(row => row.phone);
        return res.status(200).json({ list: existingPhones });
    } catch (error) {
        if (connection) {
            return res.status(500).json({ error: 'Failed to fetch data from database' });
        }
        else {
            return res.status(500).json({ error: 'Failed to connection to database' });
        };

    } finally {
        if (connection) {
            connection.release()
        }
    }
})

app.post('/api/delete', async (req, res) => {
    let { day, count, filename } = req.body;
    day = Number(day);
    count = Number(count);
    let connection;
    try {
        const type = String(day) + count;
        connection = await pool.getConnection();
        await connection.execute(`DELETE FROM phones WHERE type = ?`, [type]);
        const [file] = await connection.query(`SELECT * FROM files WHERE day = ?`, [day]);
        if (file[0].count === 0 && count === 0) {
            await connection.execute(`DELETE FROM files WHERE day = ?`, [day]);
            return res.status(200).json({ msg: "success" });
        }
        if (file[0]) {
            const file_name = JSON.parse(file[0].file_name)
            var filteredArr = file_name.filter(function (str) {
                return str !== filename;
            });
            await connection.query('UPDATE files SET count = ? , file_name = ? WHERE day = ?', [count - 1, JSON.stringify(filteredArr), day]);
        }
        return res.status(200).json({ msg: "success" })
    } catch (error) {
        if (connection) {
            return res.status(500).json({ error: 'Failed to fetch data from database' });
        }
        else {
            return res.status(500).json({ error: 'Failed to connection to database' });
        };

    } finally {
        if (connection) {
            connection.release()
        }
    }
})

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [users] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
        if (!users[0]) {
            return res.status(200).json({ msg: '账户不存在', code: 201 })
        }
        if (password !== users[0].password) {
            return res.status(200).json({ msg: '密码错误', code: 202 })
        }
        return res.status(200).json({ msg: '登录成功', code: 1 })
    } catch (error) {
        if (connection) {
            return res.status(500).json({ error: 'Failed to fetch data from database' });
        }
        else {
            return res.status(500).json({ error: 'Failed to connection to database' });
        };

    } finally {
        if (connection) {
            connection.release()
        }
    }
});

// 启动服务器监听指定端口号
app.listen(3001, () => {
    console.log('Server is running on port 3001');
});