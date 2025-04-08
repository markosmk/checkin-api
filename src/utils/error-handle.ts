import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import type { HTTPResponseError } from "hono/types"
import { ZodError } from "zod"

export function errorHandle(err: Error | HTTPResponseError, c: Context) {
  // Validacion Zod
  if (err instanceof ZodError) {
    console.error("Validation Errors:", err.issues)
    return c.json(
      {
        statusCode: 400,
        error: "Bad Request",
        message: "Error de validación de entrada.",
        validation: err.issues,
      },
      400
    )
  }

  // Validación Valibot
  // if (v.isValiError(error)) {
  //   const flattenedErrors = v.flatten(error.issues).nested
  //   console.error("Validation Errors:", flattenedErrors)
  //   return reply.code(400).send({
  //     statusCode: 400,
  //     error: "Bad Request",
  //     message: "Error de validación de entrada.",
  //     validation: flattenedErrors,
  //   })
  // }

  if (err instanceof HTTPException) {
    // return err.getResponse()
    return c.json({ message: err.message || err.getResponse() }, err.status)
  }

  if (err instanceof Error) {
    return c.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ha ocurrido un error inesperado en el servidor.",
        ...(process.env.NODE_ENV !== "production" && { details: err.message, stack: err.stack }),
      },
      500
    )
  }

  return c.json(
    {
      statusCode: 500,
      error: "Internal Server Error",
      message: "Ha ocurrido un error completamente inesperado.",
    },
    500
  )
}
