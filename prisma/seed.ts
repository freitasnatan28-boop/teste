// Cria as tags padrão (natal, casa, moda, maternidade, verão).
// Rode com: npm run db:seed   (pode rodar mais de uma vez sem duplicar)
import { PrismaClient } from "@prisma/client";
import { TAGS_PADRAO } from "../src/lib/tags";

const prisma = new PrismaClient();

async function main() {
  for (const t of TAGS_PADRAO) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name, keywords: JSON.stringify(t.keywords), categoryIds: JSON.stringify(t.categoryIds) },
      update: {},
    });
  }
  console.log(`Tags prontas: ${TAGS_PADRAO.map((t) => t.name).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
