const { v4: uuidv4 } = require('uuid');
const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');
const { sendToUser } = require('../websocket');

function getChatRoutes() {
    return [
        {
            method: 'get',
            path: '/api/chat/:otherUserId',
            handler: authenticated(async (req, res) => {
                try {
                    const result = await sqlQuery(
                        `SELECT * FROM chat WHERE (sender_id=@me AND receiver_id=@other) OR (sender_id=@other AND receiver_id=@me) ORDER BY timestamp ASC`,
                        [
                            { name: 'me', type: mssql.VarChar, value: req.user.userId },
                            { name: 'other', type: mssql.VarChar, value: req.params.otherUserId }
                        ]
                    );
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/chat',
            handler: authenticated(async (req, res) => {
                try {
                    const { receiver_id, message_text, attachment, reply_to_id } = req.body;
                    const id = uuidv4();
                    await sqlQuery(
                        `INSERT INTO chat (id, sender_id, receiver_id, message_text, attachment, reply_to_id, status, timestamp) VALUES (@id, @sid, @rid, @msg, @att, @reply, 'unread', GETDATE())`,
                        [
                            { name: 'id', type: mssql.VarChar, value: id },
                            { name: 'sid', type: mssql.VarChar, value: req.user.userId },
                            { name: 'rid', type: mssql.VarChar, value: receiver_id },
                            { name: 'msg', type: mssql.VarChar, value: message_text },
                            { name: 'att', type: mssql.VarChar, value: attachment || null },
                            { name: 'reply', type: mssql.VarChar, value: reply_to_id || null }
                        ]
                    );
                    sendToUser(receiver_id, 'chat:message', {
                        id,
                        sender_id: req.user.userId,
                        message_text,
                        attachment,
                        timestamp: new Date().toISOString()
                    });
                    res.json({ success: true, id });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/chat/mark-read',
            handler: authenticated(async (req, res) => {
                try {
                    const { otherUserId } = req.body;
                    await sqlQuery(
                        `UPDATE chat SET status='read' WHERE sender_id=@other AND receiver_id=@me AND status='unread'`,
                        [
                            { name: 'other', type: mssql.VarChar, value: otherUserId },
                            { name: 'me', type: mssql.VarChar, value: req.user.userId }
                        ]
                    );
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getChatRoutes };
