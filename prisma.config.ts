import "dotenv/config";
import { definePrismaConfig, env } from "prisma/config";

export default definePrismaConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});