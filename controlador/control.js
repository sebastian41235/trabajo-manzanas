const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const session = require('express-session');
const path = require('path');
const app = express();

// Configuración del middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(session({
    secret: 'hola',
    resave: false,
    saveUninitialized: false
}));

// Configuración de la conexión a la base de datos
const db = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'manzana1',
};

// Ruta para crear usuarios
app.post('/crear', async (req, res) => {
    const { Nombre, Tipo_documento, Documento, id_M1 } = req.body;
    try {
        const basedb = await mysql.createConnection(db);
        const [indicador] = await basedb.execute('SELECT * FROM usuario WHERE Documento = ? AND Tipo_documento = ?', [Documento, Tipo_documento])

        if (indicador.length > 0) {
            res.status(401).send(`
                <script>
                    window.onload = function(){
                        alert('El usuario ya existe');
                        window.location.href = 'http://127.0.0.1:5501/vistas/index.html'
                    }
                </script>
            `)
        } 
        else {
            await basedb.execute(`INSERT INTO usuario (Nombre, Tipo_documento, Documento, id_M1) VALUES(?,?,?,?)`, [Nombre, Tipo_documento, Documento, id_M1]);
            res.status(201).send(`
                <script>
                    window.onload = function(){
                        alert('Datos guardados');
                        window.location.href='http://127.0.0.1:5501/vistas/index.html';
                    }
                </script>
            `);
        }
        await basedb.end();
    } catch (error) {
        console.error('Error al conectar a la base de datos: ', error);
        res.status(500).send(`
            <script>
                window.onload = function(){
                    alert('Error al conectar a la base de datos');
                    window.location.href='http://127.0.0.1:5501/vistas/registro.html';
                }
            </script>
        `);
    }
});

// Ruta para iniciar sesión
app.post('/Iniciar', async (req, res) => {
    const { documento, tipo_documento } = req.body;
    try {
        const basedb = await mysql.createConnection(db);
        const [indicador] = await basedb.execute('SELECT * FROM usuario WHERE documento = ? AND tipo_documento = ?', [documento, tipo_documento]);
        console.log(indicador)
        if (indicador.length > 0) {
            req.session.usuario = indicador[0].nombre;
            req.session.documento = documento;
            if (indicador[0].rol == "admin") {
                res.sendFile(path.join(__dirname,'../vistas/admin.html'))
            } else {
                const usuario = {nombre: indicador[0].nombre}
                console.log(usuario)
                res.locals.usuario=usuario
                res.sendFile(path.join(__dirname, '../vistas/usuario.html'));
            }
        } else {
            res.status(401).send('Usuario no encontrado');
        }
        await basedb.end();
    } catch (error) {
        console.error('Error en el servidor: ', error);
        res.status(500).send(`
            <script>
                window.onload = function(){
                    alert('Error en el servidor');
                    window.location.href='http://127.0.0.1:5501/vistas/inicio.html';
                }
            </script>
        `);
    }
});
app.post('/cerrar-usuario', async (req,res)=>{
    req.session.destroy((error)=>{
    if(error){
        console.error('Error en el servidor',error);
        res.status(500).send('Error al cerrar sesion')
    }else{
        res.status(200).send('Sesion cerrada');
    }
  })
})
app.post('/obtener-usuarios',(req,res)=>{
    const usuario = req.session.usuario;
    if(usuario){
        res.json({nombre: usuario});
    }
    else{res.status(401).send('usuario no auntenticado')
}
res.sendFile(__dirname,'../vistas/usuario.html');
})
app.post('/perra',(req,res)=>{
    res.sendFile(path.join(__dirname,'./vistas/admin.html'));
});
// Ruta para obtener servicios de usuario
app.post('/obtener-servicios-usuario', async (req, res) => {
    const usuario = req.session.usuario;
    const documento = req.session.documento;
    console.log(usuario,documento)
    try {
        const basedb = await mysql.createConnection(db);
        const [serviciosData] = await basedb.query('SELECT servicios.nombre_servicio FROM usuario INNER JOIN manzanas on manzanas.id_manzanas = usuario.id_M1 INNER JOIN servicios_manzanas on servicios_manzanas.id_M1 = manzanas.id_manzanas INNER JOIN servicios on servicios.id_servicio = servicios_manzanas.id_S1 WHERE usuario.documento = ?', [documento]);
        console.log (serviciosData)
        res.json({ servicios: serviciosData.map(row => row.nombre_servicio) });
        await basedb.end();
    } catch (error) {
        console.error('Error en el servidor: ', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para guardar servicios de usuario
app.post('/guardar-servicios-usuario', async (req, res) => {
    const usuario = req.session.usuario;
    const documento = req.session.documento;
    console.log(usuario,documento)
    const {servicios,fechahora} = req.body;

    const basedb = await mysql.createConnection(db);
    const [consulID] = await basedb.query('SELECT usuario.codigo, servicios.id_servicio FROM usuario INNER JOIN servicios WHERE usuario.documento = ? AND servicios.nombre_servicio = ?',[documento,servicios])
    console.log(consulID);
    try {
        
            await basedb.execute('INSERT INTO solicitudes(`Fecha`, `Codigo_u`, `codigo_s`) values (?,?,?)', [fechahora, consulID[0].codigo, consulID[0].id_servicio]);
        
        await basedb.end();
    } catch (error) {
        console.error('Error en el servidor: ', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para obtener solicitudes de usuario
app.post('/solicitudes-usuario', async (req, res) => {

    const  usuario  = req.session.usuario;
    const documento = req.session.documento;
    console.log(usuario)
    try {
        const basedb = await mysql.createConnection(db);
        const [soli] = await basedb.execute('SELECT solicitudes.Fecha, servicios.nombre_servicio FROM solicitudes INNER JOIN usuario ON solicitudes.Codigo_u = usuario.codigo INNER JOIN manzanas on usuario.id_M1 = manzanas.id_manzanas INNER JOIN servicios_manzanas on manzanas.id_manzanas = servicios_manzanas.id_M1 INNER JOIN servicios on servicios_manzanas.id_S1 = servicios.id_servicio WHERE usuario.nombre = ? AND solicitudes.codigo_s = servicios.id_servicio', [usuario]);
        console.log(soli)
        res.json({ solicitud: soli.map(raw => ([raw.Fecha, raw.nombre_servicio])) });
        await basedb.end();
    } catch (error) {
        console.error('Error en la solicitud: ', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para eliminar solicitudes
app.post('/eliminar-solicitudes', async(req, res) => {
    const documento = req.session.documento;
    const basedb = await mysql.createConnection(db);
    const [IDsoli] = await basedb.execute('SELECT solicitudes.Id_solicitudes FROM solicitudes INNER JOIN usuario ON usuario.codigo = solicitudes.Codigo_u INNER JOIN manzanas ON manzanas.id_manzanas = usuario.id_M1 INNER JOIN servicios_manzanas ON servicios_manzanas.id_M1 = manzanas.id_manzanas INNER JOIN servicios ON servicios.id_servicio = servicios_manzanas.id_S1 WHERE usuario.documento = ?', [documento]);
    try {
        await basedb.execute('DELETE FROM solicitudes WHERE solicitudes.Id_solicitudes = ? ', [IDsoli[0].Id_solicitudes]);
        await basedb.end();
    } catch (error) {
        console.error('Error en el servidor: ', error);
        res.status(500).send('Error en el servidor');
    }
});
app.post('/obtener-usuario', async(req,res)=>{
    try{
        const basedb = await mysql.createConnection(db);
        const[IDusu]= await basedb.execute('SELECT * FROM usuario')
        console.log(IDusu)
        res.json({usuario: IDusu.map(rxw=>([rxw.Id_solicitudes, rxw.nombre, rxw.tipo_documento, rxw.documento, rxw.codigo]))})
    }
    catch(error){
        console.error('error en el servidor',error)
        res.status(500).send('Error en el servidor')
    }
});
// Iniciar el servidor
app.listen(3000, () => {
    console.log("Servidor Node.js escuchando en el puerto 3000");
});
