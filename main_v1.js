//load express, handlebars, mysql2
const express = require('express')
const handlebars = require('express-handlebars')
const mysql = require('mysql2/promise')

//SQL 
const SQL_GET_NAME = 'select distinct(name) from tv_shows limit ?'
const SQL_GET_TV_ID = 'select * from tv_shows where tvid = ?'
const SQL_GET_TV = 'select tvid, name from tv_shows ORDER BY name ASC limit  ?'

const LIMIT = 30

const mkQuery = (sqlStmt, pool) => {
    const f = async (params) => {
        //get the connection from the pool
        const conn = await pool.getConnection()

        try{
            //execute the query with the parameter
            const result = await pool.query(sqlStmt, params)
            return results[0]

        } catch(e) {
            return Promise.reject(e)

        } finally {
            conn.release()
        }
    }
    return f
}

//configure PORT
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000


//create the database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost', 
    port: parseInt(process.env.DB_PORT) || 3306, 
    database: process.env.DB_NAME || 'leisure',
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,    
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 4,
    timezone: '+08:00'
});

const getTVList = mkQuery(SQL_GET_TV, pool)
const getTVShowById = mkQuery(SQL_GET_TV_ID, pool)

const startApp = async (app, pool) => {
    try {
        const conn = await pool.getConnection()

        console.info('Pinging database')
        await conn.ping

        conn.release()

        app.listen(PORT, () => {
            console.info(`Application start on port ${PORT} at ${new Date()}`)
        })
    } catch(e) {
        console.error('cannot ping databse', e)
    }
}

//create instance
const app = express()

//configure handlebars
app.engine('hbs', handlebars({
    defaultLayout: 'default.hbs'
}))
app.set('view engine', 'hbs')

//configure application
app.get('/', async (req, res) => {
    // const conn = await pool.getConnection()

    try{

        const result =await getTVList([ LIMIT ])
        // const result = await conn.query(SQL_GET_TV, [20])
         
        console.info('result: ', result)

        res.status(200)
        res.type('text/html')
        res.render('index',{
            apps: result
        })
    } catch(e) {
        res.status(500)
        res.type('text/html')
        res.send(JSON.stringify(e))

    }

})

app.get('/applications/:tvid', async (req, resp) => {
    const tvid = req.params['tvid']

    // const conn = await pool.getConnection()

    try {
        const result = await getTVShowById([tvid])
        // const results = await conn.query(SQL_GET_TV_ID, [ tvid ])
        const recs = results[0]
        console.info('recs', recs)

        if (recs.length <= 0) {
            //404!
            resp.status(404)
            resp.type('text/html')
            resp.send(`Not found: ${tvid}`)
            return
        }

        resp.status(200)
        resp.type('text/html')
        resp.render('applications', {
            applications: recs
        })

    } catch(e) {
        resp.status(500)
        resp.type('text/html')
        resp.send(JSON.stringify(e))
    } 
})

startApp(app, pool)