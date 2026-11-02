-- CreateTable
CREATE TABLE "EstudioConversa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL DEFAULT 'Nova conversa',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EstudioMensagem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversaId" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "texto" TEXT NOT NULL DEFAULT '',
    "arquivos" TEXT NOT NULL DEFAULT '[]',
    "provedor" TEXT,
    "bruto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstudioMensagem_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "EstudioConversa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstudioArquivo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL DEFAULT '',
    "mime" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "rotulo" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL DEFAULT '',
    "avatar" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pronto',
    "erro" TEXT,
    "meta" TEXT,
    "largura" INTEGER,
    "altura" INTEGER,
    "duracao" REAL,
    "conversaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "EstudioMensagem_conversaId_createdAt_idx" ON "EstudioMensagem"("conversaId", "createdAt");

-- CreateIndex
CREATE INDEX "EstudioArquivo_tipo_createdAt_idx" ON "EstudioArquivo"("tipo", "createdAt");

-- CreateIndex
CREATE INDEX "EstudioArquivo_avatar_idx" ON "EstudioArquivo"("avatar");
