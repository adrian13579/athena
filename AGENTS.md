# Project guidance

- Use TypeORM entities, relations, repositories, and query builders for application database access. Avoid handwritten SQL in services and repositories when the operation can be expressed with TypeORM.
- Keep SQL in versioned TypeORM migrations for schema creation and changes. Do not enable automatic schema synchronization in application configuration.
