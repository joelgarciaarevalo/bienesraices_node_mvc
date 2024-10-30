import nodemailer from 'nodemailer'

const emailRegistro = async (datos) =>{

    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    const {nombre, email, token} = datos

    // Enviar el email
    await transport.sendMail({
        from: 'BienesRaices.com',
        to: email,
        subject:'Confirma tu cuenta en BienesRaices.com',
        text:'Confirma tu cuenta en BienesRaices.com',
        html: `
            <p>Hola ${nombre}, comprueba tu cuenta en BienesRaices.com</p>
            <p>Tu cuenta ya esta lista, solo debes confirmarla en el siguiente enlace:
            <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/confirmar-cuenta/${token}">Confirmar Cuenta</a></p>
            <p>Si no creaste esta cuenta, ignora el mensaje</p>
        `
    })
}

const emailOlvidePassword = async (datos) =>{

    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    const {nombre, email, token} = datos

    // Enviar el email
    await transport.sendMail({
        from: 'BienesRaices.com',
        to: email,
        subject:'Reestablece tu contraseña en BienesRaices.com',
        text:'Reestablece tu contraseña en BienesRaices.com',
        html: `
            <p>Hola ${nombre}, has solicitado reestablecer tu contraseña en BienesRaices.com</p>
            <p>Reestablece tu cntraseña en el siguiente enlace:
            <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/olvide-password/${token}">Reestablecer contraseña</a></p>
            <p>Si no solicitaste restablecer tu contraseña, ignora el mensaje</p>
        `
    })
}


export {
    emailRegistro,
    emailOlvidePassword
}