import { unlink} from 'node:fs/promises'
import { validationResult } from 'express-validator'
import { Precio, Categoria, Usuario, Propiedad, Mensaje } from '../models/index.js'
import { esVendedor, formatearFecha } from '../helpers/index.js'

const admin = async (req, res) => {
    // Leer querystring
    let { pagina: paginaActual } = req.query;
    const expresion = /^[0-9]$/;
 
    if (!expresion.test(paginaActual)) {
        return res.redirect('/mis-propiedades?pagina=1');
    }
 
    // Convertir paginaActual a número
    paginaActual = Number(paginaActual);
 
    try {
        const { id } = req.usuario;
 
        // Limites y Offset para el paginador
        const limit = 3;
        const offset = ((paginaActual * limit) - limit); 
 
        const [propiedades, total] = await Promise.all([
            Propiedad.findAll({
                limit: limit,
                offset: offset,
                where: {
                    usuarioId: id
                },
                include: [
                    {model: Categoria, as: 'categoria'},
                    {model: Precio, as: 'precio'},
                    {model: Mensaje, as: 'mensajes'}
                ],
            }),
            Propiedad.count({
                where: {
                    usuarioId: id
                }
            })
        ]);
 
        // Determinar si es la primera página
        const isFirstPage = paginaActual === 1;
 
        res.render('propiedades/admin',{
            pagina: 'Mis propiedades',
            csrfToken: req.csrfToken(),
            propiedades: propiedades,
            paginas: Math.ceil(total / limit),
            paginaActual: paginaActual,
            total: total,
            offset,
            limit,
            isFirstPage: isFirstPage
        });
 
    } catch (error) {
        console.log(error);
    }
}

//Formulario para crear una nueva propiedad
const crear = async (req, res) => {
    // Consultar precios y categorias 
    const [categorias, precios] = await Promise.all([
        Categoria.findAll(),
        Precio.findAll()
    ])

    res.render('propiedades/crear',{
        pagina:'Crear propiedad',
        csrfToken : req.csrfToken(),
        categorias,
        precios,
        datos: {}
    })
}
const guardar =  async (req, res) => {

    // Validacion
    let resultado = validationResult(req)
    if(!resultado.isEmpty()){
        // Consultar precios y categorias 
        const [categorias, precios] = await Promise.all([
            Categoria.findAll(),
            Precio.findAll()
        ])

        return res.render('propiedades/crear',{
            pagina:'Crear propiedad',
            csrfToken : req.csrfToken(),
            categorias,
            precios,
            errores: resultado.array(),
            datos: req.body
        })
    }

    // Crear un registro
    const { titulo, descripcion, habitaciones,estacionamiento , wc, calle, lat, lng, precio: precioId, categoria: categoriaId } = req.body

    const { id: usuarioId } = req.usuario

    try{
        const propiedadGuardada = await Propiedad.create({
            titulo,
            descripcion,
            habitaciones,
            estacionamiento,
            wc,
            calle,
            lat,
            lng,
            precioId,
            categoriaId,
            usuarioId,
            imagen: ''
        })
        
        const { id } = propiedadGuardada
        res.redirect(`/propiedades/agregar-imagen/${id}`)

    } catch(error){
        console.log(error)
    }
}

const agregarImagen = async (req, res) => {

    const { id } = req.params
    
    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id)
    if (!propiedad) {
        return res.redirect('/mis-propiedades')
    }

    // Validar que la propiedad este publicada
    if(propiedad.publicado){
        return res.redirect('/mis-propiedades')
    }
    
    // Validar que la propiedad sea de la persona que visita la pagina
    if(req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    res.render('propiedades/agregar-imagen', {
        pagina: `Agregar imagen: ${propiedad.titulo}`,
        csrfToken : req.csrfToken(),
        propiedad
    })
}
const almacenarImagen = async (req, res, next) => {
    
    const { id } = req.params
    
    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id)
    if (!propiedad) {
        return res.redirect('/mis-propiedades')
    }

    // Validar que la propiedad este publicada
    if(propiedad.publicado){
        return res.redirect('/mis-propiedades')
    }
    
    // Validar que la propiedad sea de la persona que visita la pagina
    if(req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    try {
        console.log(req.file)
        
        // Almacenar la imagen y publicar propiedad
        propiedad.imagen = req.file.filename
        propiedad.publicado = 1

        await propiedad.save()

        next()

    } catch (error) {
        console.log(error)
    }
}

const editar = async (req, res) => {

    const { id } = req.params
        
    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id)
    if (!propiedad) {
        return res.redirect('/mis-propiedades')
    }
    // Validar que la propiedad sea de la persona que visita la pagina
    if(propiedad.usuarioId.toString() !== req.usuario.id.toString()){
        return res.redirect('/mis-propiedades')
    }

    // Consultar precios y categorias 
    const [categorias, precios] = await Promise.all([
        Categoria.findAll(),
        Precio.findAll()
    ])
        
    res.render('propiedades/editar',{
        pagina:`Editar propiedad: ${propiedad.titulo} `,
        csrfToken : req.csrfToken(),
        categorias,
        precios,
        datos: propiedad
    })
}

const guardarCambios = async (req, res, next) => {

    // Validacion
    let resultado = validationResult(req)
    if(!resultado.isEmpty()){
        // Consultar precios y categorias 
        const [categorias, precios] = await Promise.all([
            Categoria.findAll(),
            Precio.findAll()
        ])

        return res.render('propiedades/editar',{
            pagina:'Editar propiedad',
            csrfToken : req.csrfToken(),
            categorias,
            precios,
            errores: resultado.array(),
            datos: req.body
        })
    }
    const { id } = req.params
        
    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id)
    if (!propiedad) {
        return res.redirect('/mis-propiedades')
    }
    // Validar que la propiedad sea de la persona que visita la pagina
    if(propiedad.usuarioId.toString() !== req.usuario.id.toString()){
        return res.redirect('/mis-propiedades')
    }

    // Reescribir el objeto y actualizarlo
    try{
        const { titulo, descripcion, habitaciones,estacionamiento , wc, calle, lat, lng, precio: precioId, categoria: categoriaId } = req.body
        propiedad.set({
            titulo, 
            descripcion, 
            habitaciones,
            estacionamiento, 
            wc, 
            calle, 
            lat, 
            lng,
            precioId,
            categoriaId
        })

        await propiedad.save();
        res.redirect('/mis-propiedades')

    } catch(error){
        console.log(error)
    }
}

const eliminar = async (req, res, next) => {

    const { id } = req.params

    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id)
    if (!propiedad) {
        return res.redirect('/mis-propiedades')
    }
    // Validar que la propiedad sea de la persona que visita la pagina
    if(req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }
    // Elimnar la imagen
    await unlink(`public/uploads/${propiedad.imagen}`)
    console.log(`Se elimino la imagen ${propiedad.imagen}`)
    // Eliminar propiedad
    await propiedad.destroy()
    res.redirect('/mis-propiedades')
}

// Modifica el estado de la propiedad
const cambiarEstado = async (req, res) => {
        
    const { id } = req.params
    
    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id)
    if (!propiedad) {
        return res.redirect('/mis-propiedades')
    }
    // Validar que la propiedad sea de la persona que visita la pagina
    if(req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }
    // Actualizar si esta publicada o no
    propiedad.publicado = !propiedad.publicado
    await propiedad.save()
    res.json({
        resultado: 'ok'
    })
}



// Muestra una propiedad
const mostrarPropiedad = async (req, res) => {
    const { id } = req.params

    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id, {
        include: [
            {model: Categoria, as: 'categoria'},
            {model: Precio, as: 'precio'}
        ]
    })
    if (!propiedad || !propiedad.publicado) {
        return res.redirect('/404')
    }

    res.render('propiedades/mostrar',{
        propiedad,
        pagina: propiedad.titulo,
        csrfToken : req.csrfToken(),
        usuario: req.usuario,
        esVendedor: esVendedor(req.usuario?.id, propiedad.usuarioId)
    })
}

const enviarMensaje = async (req, res) => {
    const { id } = req.params


    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id, {
        include: [
            {model: Categoria, as: 'categoria'},
            {model: Precio, as: 'precio'}
        ]
    })
    if (!propiedad) {
        return res.redirect('/404')
    }

    // Renderizar los errores en caso de tenerlos
    // Validacion
    let resultado = validationResult(req)
    if(!resultado.isEmpty()){

        return res.render('propiedades/mostrar',{
            propiedad,
            pagina: propiedad.titulo,
            csrfToken : req.csrfToken(),
            usuario: req.usuario,
            esVendedor: esVendedor(req.usuario?.id, propiedad.usuarioId),
            errores: resultado.array()
        })

    }

    const { mensaje } = req.body 
    const { id: propiedadId } = req.params 
    const { id: usuarioId } = req.usuario

    // Almacenar el mensaje
    await Mensaje.create({
        mensaje,
        propiedadId,
        usuarioId
    })

    res.redirect('/')
}

// Leer mensajes recibidos
const verMensajes = async (req, res) => {

    const { id } = req.params
    
    // Validar que la propiedad exista
    const propiedad = await Propiedad.findByPk(id, {
        include: [
            {model: Mensaje, as: 'mensajes',
                include: [
                    {model: Usuario.scope('eliminarPassword'), as: 'usuario'}
                ]
            },
        ],
    })
    if (!propiedad) {
        return res.redirect('/mis-propiedades')
    }

    // Validar que la propiedad sea de la persona que visita la pagina
    if(req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    res.render('propiedades/mensajes', {
        pagina: 'Mensajes',
        mensajes: propiedad.mensajes,
        formatearFecha
    })
}

export {
    admin,
    crear,
    guardar,
    agregarImagen,
    almacenarImagen,
    editar,
    guardarCambios,
    eliminar,
    cambiarEstado,
    mostrarPropiedad,
    enviarMensaje,
    verMensajes
}