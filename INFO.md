### Para trabajar con el proyecto con D1 y localmente, sigue estos pasos:

- 1.  gerena el sql de drizzle con el comando `pnpm run db:generate`
- 2.  esto creara un archivo `xxxx.sql` en la carpeta `migrationsD1`
- 2.1 revisa si en d1 esta la base de datos, si no esta, crea una con el comando `pnpm wrangler d1 create <nombre de la base de datos>`
- 2.2 recuerda actualizar los datos de la base de datos en el archivo `wrangler.toml` en la seccion `d1_databases`
- 3.  ejecuta el archivo con el comando `pnpm wrangler d1 execute <nombre de la base de datos> --local --file=migrationsD1/xxxx.sql`
- 3.1 esto generarar el archivo `.sqlite` en el state de .wrangler para trabajar localmente
- 6.  para ejecutar el proyecto localmente, ejecuta el comando `pnpm run dev`

si queremos subir la migracion a d1, ejecuta el comando `pnpm wranger d1 execute <nombre de la base de datos> --remote --file=migrationsD1/xxxx.sql`
`--remote` indica que la migracion se ejecutara en d1

Cambiar datos de una tabla

- 1 Cuando se cambia un dato o nombre de tabla, o mas tablas, se debe ejecutar el comando `pnpm run db:generate` para generar el archivo el archivo de migracion de drizzle en la carpeta `migrations`
- 2 Luego se debe ejecutar el comando `pnpm wrangler d1 execute <nombre de la base de datos> --local --file=migrations/xxxx.sql` para ejecutar la migracion en local
- 3 Luego se debe ejecutar el comando `pnpm run dev` para ejecutar el proyecto localmente

### Actualizando base de datos

aveces cuando se agregan tablas y relaciones, lo mejor no es hacer una migracion para actualizar la base de datos principal, sino borrar y reescribir toda la base.

- 1. comando para borrar loclmente `rm -rf .wrangler migrations` estas carpetas se crean al ejecutar el comando `pnpm run db:generate` y el `wrangler d1 execute ...`,
- 2. correr el comando `pnpm run db:generate` para generar el archivo de migracion de drizzle en la carpeta `migrations`
- 3. comando para borrar en d1 en local `pnpm wrangler d1 execute <nombre de la base de datos> --local --file=./migrations/xxxx.sql`
- 4. comando para borrar en d1 en remoto `pnpm wrangler d1 execute <nombre de la base de datos> --remote --file=./migrations/xxxx.sql`
