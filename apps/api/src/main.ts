import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.setGlobalPrefix("api", { exclude: ["health"] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("FinanZen API")
      .setDescription("REST API for the FinanZen personal finance platform")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
