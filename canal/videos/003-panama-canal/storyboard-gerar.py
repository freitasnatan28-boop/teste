import json, math, sys
# Storyboard do vídeo 003 (Canal do Panamá). Uso: python3 storyboard-gerar.py storyboard.json
def V(lon, lat, z): return {"centro": [lon, lat], "zoom": z}
def Z(p, **k): return {"pontos": [list(x) for x in p], **k}
def A(tipo, lonlat, **k): return {"tipo": tipo, "lonlat": list(lonlat), **k}
def R(pontos, **k): return {"pontos": [list(x) for x in pontos], **k}

DC=(-77.04,38.9); NY=(-74.0,40.7); SF=(-122.42,37.77); PTY=(-79.52,8.98); COLON=(-79.9,9.36); BALBOA=(-79.57,8.95)
GATUN=(-79.92,9.27); MIRAFLORES=(-79.59,9.02); PARIS=(2.35,48.85); SUEZ=(32.35,30.6); BOGOTA=(-74.07,4.71)
BARBADOS=(-59.55,13.1); JAMAICA=(-76.8,18.0); MARTINICA=(-61.0,14.6); HK=(114.17,22.3); BEIJING=(116.4,39.9)

# Linha do canal (Colón -> Balboa) e a Zona do Canal: 5 milhas (~0,075 grau) para cada lado.
CANAL = [(-79.917,9.40),(-79.92,9.27),(-79.88,9.2),(-79.78,9.14),(-79.69,9.12),(-79.65,9.06),(-79.6,9.01),(-79.57,8.95),(-79.53,8.86)]
def faixa(linha, w):
    esq, dir_ = [], []
    for i,(x,y) in enumerate(linha):
        a = linha[max(0,i-1)]; b = linha[min(len(linha)-1,i+1)]
        dx, dy = b[0]-a[0], b[1]-a[1]; n = math.hypot(dx,dy)
        nx, ny = -dy/n, dx/n
        esq.append((x+nx*w, y+ny*w)); dir_.append((x-nx*w, y-ny*w))
    return esq + dir_[::-1]
ZONA = faixa(CANAL, 0.075)
LAGO = [(-80.02,9.27),(-79.9,9.29),(-79.8,9.24),(-79.72,9.17),(-79.68,9.11),(-79.75,9.07),(-79.86,9.1),(-79.97,9.15),(-80.05,9.2)]
# Rotas grandes
HORN = [NY,(-62,25),(-35,-6),(-40,-23),(-55,-38),(-63,-50),(-67.3,-56.6),(-76,-50),(-74,-35),(-80,-12),(-92,4),(-108,20),SF]
VIA_PANAMA = [NY,(-74,28),(-74.5,20),(-79.9,9.6),(-79.6,8.7),(-86,11),(-105,20),SF]
NICARAGUA = [(-83.7,11.0),(-84.6,11.4),(-85.4,11.6),(-85.9,11.2)]

beats = {}
# ---- 1. We're Taking It Back
beats["b01"] = {"cenas": [
  {"tipo":"mapa","de":V(-40,25,1.3),"para":V(-77,39,7),"ano":"2025","atores":[
     A("retrato",DC,img="trump",nome="TRUMP",em="President"),
     A("fala",DC,texto="WE'RE TAKING IT BACK!",em="taking")]},
  {"em":"Panama Canal","tipo":"mapa","para":V(-79.8,9.2,24),"paises":[{"iso":"PAN","bandeira":"PAN","em":"Panama"}],"atores":[
     A("rotulo",(-79.8,10.1),texto="PANAMA CANAL",cor="#ffd400",em="Canal")]},
]}
beats["b02"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.7,9.0,70),"paises":[{"iso":"PAN","bandeira":"PAN"}],"atores":[
     A("bandeira",PTY,pais="PAN",em="answer"),
     A("fala",PTY,texto="EVERY SQUARE METER IS OURS.",em="belongs")]},
]}
beats["b03"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.15,82),"zonas":[Z(ZONA,bandeira="USA",em="built")],"atores":[
     A("bandeira",(-81.1,9.9),pais="USA",em="States"),
     A("rotulo",(-79.75,9.62),texto="85 YEARS",cor="#ffd400",em="eighty-five")]},
  {"em":"1999","tipo":"mapa","para":V(-79.75,9.15,80),"ano":"1999","zonas":[Z(ZONA,bandeira="USA"),Z(ZONA,bandeira="PAN",em="handed")],"atores":[
     A("preco",(-81.0,9.75),valor=0,rotulo="PANAMA PAID",em="cent")]},
]}
beats["b04"] = {"cenas": [
  {"tipo":"mapa","para":V(-82,14,6),"titulo":"WHY AMERICA GAVE AWAY\nTHE PANAMA CANAL","som":"impacto","paises":[{"iso":"PAN","bandeira":"PAN"},{"iso":"USA","bandeira":"USA"}]},
  {"em":"understand","tipo":"linhaTempo","itens":[{"data":"1881","texto":"The French try"},{"data":"1903","texto":"Panama is born"},{"data":"1914","texto":"The canal opens"},{"data":"1964","texto":"Flag riots"},{"data":"1977","texto":"Carter's treaty"},{"data":"1999","texto":"Handed over"},{"data":"2025","texto":"\"We want it back\""}]},
  {"em":"ships","tipo":"mapa","para":V(-75,-5,1.7),"atores":[
     A("rotulo",(-60,-12),texto="AROUND A WHOLE CONTINENT",cor="#ffd400",em="continent")]},
]}
# ---- 2. The Shortcut
beats["b05"] = {"cenas": [
  {"tipo":"mapa","para":V(-88,-6,1.75),"rotas":[R(HORN,icone="navio",pais="USA",cor="#ffffff",em="New",dur=230,contador={"ate":13000,"sufixo":"MILES"})],"atores":[
     A("rotulo",(-74,44.5),texto="NEW YORK",em="New"),
     A("rotulo",(-131,33.5),texto="SAN FRANCISCO",em="San"),
     A("icone",(-67.3,-50),emoji="🌪️",rotulo="CAPE HORN",em="storms")]},
]}
beats["b06"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.7,9.1,26),"paises":[{"iso":"PAN","cor":"#ffd400","em":"strip"}],"atores":[
     A("rotulo",(-78.2,11.4),texto="ATLANTIC",cor="#4cc9f0",em="two"),
     A("rotulo",(-81.2,7.0),texto="PACIFIC",cor="#4cc9f0",em="oceans"),
     A("rotulo",(-79.7,9.75),texto="≈ 50 MILES",em="fifty")]},
  {"em":"Cut","tipo":"mapa","para":V(-96,23,2.6),"rotas":[
     R(HORN,cor="#888888",tracejada=True,inicio=0,fim=0.02),
     R(VIA_PANAMA,icone="navio",pais="USA",cor="#ffd400",em="same",dur=110,contador={"ate":5000,"sufixo":"MILES"})],"atores":[
     A("icone",(-79.7,9.2),emoji="👑",rotulo="CONTROL = POWER",em="Whoever")]},
]}
beats["b07"] = {"cenas": [
  {"tipo":"mapa","para":V(-80,9.3,20),"ano":"1534","paises":[{"iso":"PAN","bandeira":"ESP","em":"King"}],"atores":[
     A("bandeira",(-78.5,8.6),pais="ESP",em="Spain"),
     A("icone",(-79.75,9.6),icone="interrogacao",rotulo="CAN IT BE CUT?",em="survey"),
     A("reacao",(-79.75,9.6),emoji="🤷",em="nobody")]},
]}
# ---- 3. The French Disaster
beats["b08"] = {"cenas": [
  {"tipo":"mapa","para":V(-22,26,2.5),"ano":"1881","rotas":[R([PARIS,(-30,30),(-60,18),COLON],icone="navio",pais="FRA",cor="#ffffff",em="arrived",dur=80)],"atores":[
     A("retrato",PARIS,img="lesseps",nome="DE LESSEPS",em="Ferdinand"),
     A("icone",SUEZ,icone="ancora",rotulo="SUEZ CANAL",em="Suez")]},
  {"em":"dig","tipo":"mapa","para":V(-79.75,9.15,80),"rotas":[R(CANAL,cor="#e63946",tracejada=True,em="dig",dur=50)],"atores":[
     A("rotulo",(-79.2,9.55),texto="SEA-LEVEL CANAL",cor="#e63946",em="sea"),
     A("icone",(-80.5,8.7),emoji="⛰️",rotulo="MOUNTAINS",em="mountains")]},
]}
beats["b09"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.15,80),"rotas":[R(CANAL,cor="#e63946",tracejada=True,inicio=0,fim=0.01)],"atores":[
     A("foto",(-80.6,9.6),img="deslizamento",rotulo="MUDSLIDES",em="Mudslides",ate="mosquitoes"),
     A("icone",(-79.95,9.55),emoji="🦟",em="mosquitoes"),
     A("icone",(-79.3,9.25),emoji="🦟",rotulo="YELLOW FEVER",em="Yellow"),
     A("icone",(-80.6,8.75),emoji="🦟",rotulo="MALARIA",em="malaria"),
     A("preco",(-78.6,8.75),valor=22000,prefixo="",sufixo="DEAD",cor="#e63946",em="twenty-two")]},
]}
beats["b10"] = {"cenas": [
  {"tipo":"mapa","para":V(2.35,47,9),"ano":"1889","atores":[
     A("retrato",PARIS,img="lesseps",nome="DE LESSEPS",em="French"),
     A("carimbo",(2.0,44.6),texto="BANKRUPT",em="bankrupt"),
     A("reacao",PARIS,emoji="😱",em="scandals")]},
  {"em":"half-dug","tipo":"mapa","para":V(-79.75,9.15,80),"rotas":[R(CANAL,cor="#e63946",tracejada=True,inicio=0,fim=0.01)],"atores":[
     A("icone",(-79.7,9.6),emoji="🏚️",rotulo="ABANDONED",em="half-dug")]},
]}
# ---- 4. How to Buy a Country
beats["b11"] = {"cenas": [
  {"tipo":"mapa","para":V(-77,9,11),"ano":"1903","paises":[{"iso":"COL","bandeira":"COL","em":"Colombia"},{"iso":"PAN","bandeira":"COL","em":"province"}],"atores":[
     A("retrato",(-81.5,13.6),img="roosevelt",nome="T. ROOSEVELT",em="Theodore"),
     A("rotulo",(-79.8,9.9),texto="PANAMA = COLOMBIA",cor="#ffd400",em="province"),
     A("fala",(-81.5,13.6),texto="LET'S MAKE A DEAL.",em="offered"),
     A("bandeira",BOGOTA,pais="COL",em="senate"),
     A("fala",BOGOTA,texto="NO.",em="no")]},
]}
beats["b12"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.2,9.2,24),"paises":[{"iso":"COL","bandeira":"COL"},{"iso":"PAN","bandeira":"COL"},{"iso":"PAN","bandeira":"PAN","em":"independence"}],
   "rotas":[R([(-75.5,13.2),(-78.2,11.0),(-79.75,9.7)],icone="navio",pais="USA",cor="#ffffff",em="warship",dur=55)],"atores":[
     A("rotulo",(-78.6,10.45),texto="USS NASHVILLE",em="Nashville"),
     A("unidade",(-77.3,8.2),pais="COL",em="Colombian"),
     A("reacao",(-77.3,8.2),emoji="🚫",em="through"),
     A("rotulo",(-80.3,8.0),texto="RECOGNIZED IN DAYS",cor="#ffd400",em="recognized")]},
]}
beats["b13"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.2,80),"paises":[{"iso":"PAN","bandeira":"PAN"}],"zonas":[Z(ZONA,bandeira="USA",em="strip")],"atores":[
     A("icone",(-81.0,9.95),icone="documento",rotulo="TREATY",em="treaty"),
     A("bandeira",(-81.0,9.95),pais="FRA",em="Frenchman"),
     A("reacao",(-81.0,9.95),emoji="🤨",em="Panamanian"),
     A("rotulo",(-79.4,9.55),texto="10 MILES WIDE",em="ten"),
     A("carimbo",(-78.3,10.2),texto="FOREVER",em="forever"),
     A("preco",(-81.0,8.62),valor=10000000,rotulo="TO PANAMA",em="million")]},
]}
beats["b14"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.2,70),"zonas":[Z(ZONA,bandeira="USA")],"atores":[
     A("foto",(-80.8,9.75),img="roosevelt-pa",rotulo="ROOSEVELT IN PANAMA, 1906",em="Roosevelt"),
     A("retrato",(-78.7,9.15),img="roosevelt",nome="T. ROOSEVELT",em="bragged"),
     A("fala",(-78.7,9.15),texto="I TOOK THE ISTHMUS.",em="took")]},
  {"em":"1921","tipo":"mapa","para":V(-75,7,9),"ano":"1921","paises":[{"iso":"COL","bandeira":"COL"},{"iso":"PAN","bandeira":"PAN"}],"atores":[
     A("bandeira",BOGOTA,pais="COL",em="Colombia"),
     A("preco",(-72.5,8.8),valor=25000000,rotulo="TO COLOMBIA",em="twenty-five"),
     A("reacao",BOGOTA,emoji="🤝",em="peace")]},
]}
# ---- 5. The Big Ditch
beats["b15"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.2,80),"ano":"1904","zonas":[Z(ZONA,bandeira="USA")],"atores":[
     A("icone",(-80.0,9.6),emoji="🦟",em="mosquitoes",ate="gone"),
     A("icone",(-79.3,9.3),emoji="🦟",em="mosquitoes",ate="gone"),
     A("icone",(-79.6,8.75),emoji="🦟",em="mosquitoes",ate="gone"),
     A("retrato",(-81.0,9.3),img="gorgas",nome="DR. GORGAS",em="Army"),
     A("icone",(-78.5,9.9),emoji="🧪",rotulo="FUMIGATION",em="fumigated"),
     A("reacao",(-81.0,9.3),emoji="✅",em="gone")]},
]}
beats["b16"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.8,9.18,88),"zonas":[Z(ZONA,bandeira="USA"),Z(LAGO,cor="#4cc9f0",em="lake")],"atores":[
     A("foto",(-80.75,9.6),img="eclusa",rotulo="GATUN LOCKS",em="staircase"),
     A("icone",GATUN,emoji="🪜",rotulo="LOCKS",em="Locks"),
     A("rotulo",(-79.4,9.45),texto="+85 FT",cor="#ffd400",em="eighty-five"),
     A("icone",MIRAFLORES,emoji="⬇️",rotulo="AND DOWN",em="lower")],
   "rotas":[R(CANAL,icone="navio",pais="USA",cor="#ffffff",em="carry",dur=80)]},
]}
beats["b17"] = {"cenas": [
  {"tipo":"mapa","para":V(-70,13,7),"rotas":[
     R([BARBADOS,(-70,12.5),COLON],cor="#ffd400",tracejada=True,em="Barbados",dur=45),
     R([JAMAICA,COLON],cor="#ffd400",tracejada=True,em="Caribbean",dur=45),
     R([MARTINICA,(-70,12.8),COLON],cor="#ffd400",tracejada=True,em="came",dur=45)],"atores":[
     A("rotulo",(-59.55,14.2),texto="BARBADOS",em="Barbados"),
     A("rotulo",(-76.8,19.2),texto="JAMAICA",em="Caribbean"),
     A("rotulo",(-70,16.5),texto="TENS OF THOUSANDS",cor="#ffd400",em="Tens")]},
  {"em":"two payrolls","tipo":"mapa","para":V(-79.75,9.2,80),"zonas":[Z(ZONA,bandeira="USA")],"atores":[
     A("foto",(-80.9,9.7),img="trabalhadores",rotulo="CULEBRA CUT, 1912",em="two"),
     A("icone",(-78.8,9.75),icone="ouro",rotulo="GOLD ROLL",em="gold"),
     A("icone",(-78.8,8.7),emoji="🥈",rotulo="SILVER ROLL",em="silver"),
     A("reacao",(-78.8,8.7),emoji="😠",em="separate")]},
]}
beats["b18"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.2,80),"zonas":[Z(ZONA,bandeira="USA")],"atores":[
     A("preco",(-80.9,9.85),valor=375000000,rotulo="TOTAL COST",em="three"),
     A("preco",(-78.6,8.75),valor=5600,prefixo="",sufixo="DEAD",cor="#e63946",em="five")]},
  {"em":"August","tipo":"mapa","para":V(-79.75,9.15,82),"ano":"1914","zonas":[Z(ZONA,bandeira="USA")],"rotas":[R(CANAL,icone="navio",pais="USA",cor="#ffd400",em="first",dur=110)],"atores":[
     A("foto",(-80.9,9.65),img="ancon",rotulo="S.S. ANCON, AUG. 15, 1914",em="first"),
     A("rotulo",(-78.8,8.8),texto="≈ 10 HOURS",cor="#ffd400",em="ten")]},
]}
beats["b19"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.2,80),"zonas":[Z(ZONA,bandeira="USA")],"atores":[
     A("icone",(-80.55,9.75),emoji="👮",rotulo="POLICE",em="police"),
     A("icone",(-78.95,9.75),emoji="⚖️",rotulo="COURTS",em="courts"),
     A("icone",(-80.55,8.75),emoji="🏫",rotulo="SCHOOLS",em="schools"),
     A("icone",(-78.95,8.75),emoji="✉️",rotulo="MAIL",em="mail"),
     A("bandeira",(-79.75,8.5),pais="PAN",em="Panamanians"),
     A("reacao",(-79.75,8.5),emoji="😤",em="permission")]},
]}
# ---- 6. A Flag Too Far
beats["b20"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.56,8.98,100),"ano":"1964","zonas":[Z(ZONA,bandeira="USA")],"atores":[
     A("icone",(-79.3,9.15),emoji="🏫",rotulo="BALBOA HIGH SCHOOL",em="high"),
     A("bandeira",(-79.95,8.8),pais="PAN",em="students"),
     A("fala",(-79.95,8.8),texto="OUR FLAG!",em="raise"),
     A("reacao",(-79.95,8.8),emoji="💔",em="torn"),
     A("icone",(-79.75,9.25),icone="explosao",em="Riots"),
     A("icone",(-79.4,8.75),icone="explosao",em="border")]},
]}
beats["b21"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.6,9.0,65),"zonas":[Z(ZONA,bandeira="USA")],"atores":[
     A("preco",(-80.7,9.6),valor=20,prefixo="",sufixo="+ PANAMANIANS",cor="#e63946",em="twenty"),
     A("preco",(-78.5,9.6),valor=4,prefixo="",sufixo="US SOLDIERS",cor="#e63946",em="four"),
     A("icone",(-79.5,8.55),emoji="💔",rotulo="TIES CUT",em="cut"),
     A("rotulo",(-79.6,9.95),texto="MARTYRS' DAY",cor="#ffd400",em="Martyrs'"),
     A("icone",(-80.7,8.55),icone="alerta",rotulo="A LIABILITY",em="liability")]},
]}
# ---- 7. The Giveaway
beats["b22"] = {"cenas": [
  {"tipo":"mapa","para":V(-79,24,3.6),"ano":"1977","paises":[{"iso":"PAN","bandeira":"PAN"},{"iso":"USA","bandeira":"USA","em":"President"}],"atores":[
     A("retrato",(-80,33.5),img="carter",nome="JIMMY CARTER",em="Jimmy"),
     A("bandeira",PTY,pais="PAN",em="Omar"),
     A("rotulo",(-79.5,6.0),texto="OMAR TORRIJOS",em="Torrijos"),
     A("icone",(-63,21),icone="acordo",rotulo="2 TREATIES",em="treaties"),
     A("fala",PTY,texto="FULL CONTROL BY 1999.",em="full")]},
]}
beats["b23"] = {"cenas": [
  {"tipo":"mapa","para":V(-77.04,38.4,30),"paises":[{"iso":"USA","bandeira":"USA"}],"atores":[
     A("retrato",(-78.2,38.6),img="reagan",nome="RONALD REAGAN",em="Reagan"),
     A("fala",(-78.2,38.6),texto="WE BOUGHT IT. IT'S OURS!",em="bought"),
     A("preco",(-75.4,39.6),valor=68,prefixo="",sufixo="YES",cor="#1fa45b",em="sixty-eight"),
     A("preco",(-75.4,38.2),valor=32,prefixo="",sufixo="NO",cor="#e63946",em="thirty-two"),
     A("carimbo",(-76.8,37.3),texto="BY ONE VOTE",em="one")]},
]}
beats["b24"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.7,9.2,30),"paises":[{"iso":"PAN","bandeira":"PAN"}],"atores":[
     A("icone",(-79.7,10.1),emoji="🛡️",rotulo="NEUTRALITY TREATY",em="neutral"),
     A("bandeira",(-81.2,8.3),pais="USA",em="United"),
     A("fala",(-81.2,8.3),texto="WE CAN DEFEND IT.",em="right")]},
  {"em":"1989","tipo":"mapa","para":V(-79.8,10.5,16),"ano":"1989","paises":[{"iso":"PAN","bandeira":"PAN"}],
   "rotas":[R([(-82,24),(-80.5,15),PTY],icone="aviao",cor="#e63946",em="twenty-seven",dur=50)],"atores":[
     A("preco",(-77.2,12.8),valor=27000,prefixo="",sufixo="US TROOPS",cor="#e63946",em="twenty-seven"),
     A("icone",PTY,icone="explosao",em="invaded"),
     A("rotulo",(-79.5,7.9),texto="NORIEGA",em="Noriega")]},
]}
beats["b25"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.15,80),"ano":"1999","paises":[{"iso":"PAN","bandeira":"PAN"}],"zonas":[Z(ZONA,bandeira="USA"),Z(ZONA,bandeira="PAN",em="control")],"atores":[
     A("bandeira",(-78.9,9.75),pais="PAN",em="belonged"),
     A("reacao",(-78.9,9.75),emoji="🎉",em="belonged"),
     A("preco",(-80.8,8.7),valor=0,rotulo="PRICE PAID",em="nothing")]},
]}
# ---- 8. Why Now
beats["b26"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.2,65),"paises":[{"iso":"PAN","bandeira":"PAN"}],"rotas":[
     R(CANAL,icone="navio",pais="USA",cor="#ffffff",em="dozens",dur=90),
     R(CANAL[::-1],icone="navio",pais="CHN",cor="#ffffff",em="giant",dur=90)],"atores":[
     A("preco",(-81.0,9.85),valor=5000000000,rotulo="EVERY YEAR",em="five"),
     A("bandeira",(-78.5,9.85),pais="USA",em="biggest"),
     A("reacao",(-78.5,9.85),emoji="🥇",em="customer")]},
]}
beats["b27"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.85,9.18,100),"zonas":[Z(LAGO,cor="#4cc9f0"),Z(LAGO,cor="#c98a3b",em="drought")],"atores":[
     A("icone",(-80.45,9.45),emoji="💧",rotulo="50 MILLION GALLONS\nPER SHIP",em="fifty"),
     A("rotulo",(-79.85,9.2),texto="GATUN LAKE",cor="#ffffff",em="lake")]},
  {"em":"Crossings","tipo":"mapa","para":V(-79.5,8.95,32),"paises":[{"iso":"PAN","bandeira":"PAN"}],"atores":[
     A("icone",(-80.4,7.75),emoji="🚢",em="hundred"),
     A("icone",(-79.25,7.6),emoji="🚢",em="ships"),
     A("icone",(-78.1,7.75),emoji="🚢",em="waited"),
     A("rotulo",(-79.25,7.05),texto="100+ SHIPS IN LINE",cor="#ffd400",em="line"),
     A("preco",(-80.9,9.75),valor=4000000,rotulo="TO SKIP THE LINE",em="four")]},
]}
beats["b28"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.15,80),"paises":[{"iso":"PAN","bandeira":"PAN"}],"atores":[
     A("icone",(-80.25,9.6),icone="ancora",rotulo="CRISTÓBAL",em="both"),
     A("icone",(-79.25,8.75),icone="ancora",rotulo="BALBOA",em="ends"),
     A("bandeira",(-79.55,9.75),pais="CHN",em="Hong"),
     A("bandeira",(-79.9,8.6),pais="CHN",em="Kong"),
     A("retrato",(-78.4,9.7),img="trump",nome="TRUMP",em="Washington"),
     A("fala",(-78.4,9.7),texto="CHINA IS OPERATING IT!",em="foothold")]},
]}
beats["b29"] = {"cenas": [
  {"tipo":"mapa","para":V(0,32,1.6),"paises":[{"iso":"USA","bandeira":"USA","em":"American"},{"iso":"CHN","bandeira":"CHN","em":"Beijing"},{"iso":"PAN","cor":"#ffd400"}],
   "rotas":[R([NY,(-30,52),(60,55),HK],icone="dinheiro",cor="#1fa45b",em="BlackRock",dur=60)],"atores":[
     A("icone",NY,emoji="🏦",rotulo="BLACKROCK",em="BlackRock"),
     A("preco",(-20,22),valor=22800000000,rotulo="43 PORTS",em="twenty-three"),
     A("bandeira",BEIJING,pais="CHN",em="Beijing"),
     A("fala",BEIJING,texto="NOT SO FAST.",em="pushed"),
     A("icone",(20,48),emoji="🪢",rotulo="TUG-OF-WAR",em="tug-of-war")]},
]}
beats["b30"] = {"cenas": [
  {"tipo":"mapa","para":V(-83.5,11.5,13),"ano":"2013","paises":[{"iso":"NIC","cor":"#ffd400","em":"Nicaragua"},{"iso":"PAN","bandeira":"PAN"}],
   "rotas":[R(NICARAGUA,cor="#e63946",tracejada=True,em="rival",dur=50),R(CANAL,cor="#4cc9f0",inicio=0,fim=0.02)],"atores":[
     A("bandeira",(-85.2,13.4),pais="CHN",em="Chinese"),
     A("rotulo",(-84.8,10.0),texto="3× LONGER",cor="#ffd400",em="three"),
     A("carimbo",(-81.8,12.6),texto="NEVER BUILT",em="never")]},
]}
# ---- 9. The Pattern
beats["b31"] = {"cenas": [
  {"tipo":"mapa","para":V(-40,38,1.4),"paises":[{"iso":"GRL","bandeira":"GRL","em":"Greenland"},{"iso":"PAN","bandeira":"PAN","em":"Panama"}],"atores":[
     A("icone",(-79.7,9.2),icone="ancora",rotulo="PANAMA",em="Panama"),
     A("icone",(-42,72),icone="radar",rotulo="GREENLAND",em="Greenland"),
     A("icone",(32.4,30.5),icone="ancora",rotulo="SUEZ",em="trade"),
     A("icone",(-5.6,36),icone="ancora",rotulo="GIBRALTAR",em="navies"),
     A("rotulo",(-20,55),texto="CONTROL THE CHOKEPOINTS",cor="#ffd400",em="Control")]},
]}
beats["b32"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.75,9.2,30),"paises":[{"iso":"PAN","bandeira":"PAN"}],"rotas":[R(CANAL,icone="navio",pais="PAN",cor="#ffffff",em="Panama took",dur=90)],"atores":[
     A("icone",(-81.3,10.2),icone="dinheiro",rotulo="TOO EXPENSIVE",em="expensive"),
     A("bandeira",(-79.3,8.6),pais="PAN",em="made"),
     A("fala",(-79.3,8.6),texto="THE CANAL IS OURS.",em="ours"),
     A("icone",(-81.3,8.6),icone="documento",rotulo="1977 PROMISE",em="promise"),
     A("bandeira",(-77.9,10.4),pais="CHN",em="China"),
     A("reacao",(-77.9,10.4),emoji="👀",em="superpower")]},
]}
beats["b33"] = {"cenas": [
  {"tipo":"mapa","de":V(-79.75,9.2,20),"para":V(-60,25,1.2),"paises":[{"iso":"PAN","bandeira":"PAN"},{"iso":"GRL","bandeira":"GRL","em":"Greenland"}],"atores":[
     A("rotulo",(-42,62),texto="WATCH NEXT: GREENLAND",cor="#ffd400",em="watch")]},
  {"em":"subscribe","tipo":"final"},
]}

CHAVES = ["Panama","canal","Roosevelt","Colombia","French","Lesseps","mosquitoes","gold","silver","China","BlackRock","Nicaragua","Greenland","Carter","Reagan","Noriega","nothing","free","treaty","treaties","water","drought","forever","Barbados","Spain","Suez","Hong","riots","flag"]
sb = {"titulo":"Why America Gave Away the Panama Canal","idioma":"en","estilo":"mapa","trilha":"trilha-mapa","velocidade":1.07,"chaves":CHAVES,"beats":beats}
json.dump(sb, open(sys.argv[1],"w"), ensure_ascii=False, indent=1)
print(len(beats),"beats",sum(len(b["cenas"]) for b in beats.values()),"cenas")
