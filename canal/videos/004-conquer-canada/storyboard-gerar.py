import json, sys
# Storyboard do vídeo 004 (Canadá). Uso: python3 storyboard-gerar.py storyboard.json
def V(lon, lat, z): return {"centro": [lon, lat], "zoom": z}
def Z(p, **k): return {"pontos": [list(x) for x in p], **k}
def A(tipo, lonlat, **k): return {"tipo": tipo, "lonlat": list(lonlat), **k}
def R(pontos, **k): return {"pontos": [list(x) for x in pontos], **k}

DC=(-77.04,38.9); OTTAWA=(-75.7,45.42); QUEBEC=(-71.21,46.81); MONTREAL=(-73.57,45.5); YORK=(-79.38,43.65)
DETROIT=(-83.05,42.33); WINDSOR=(-83.03,42.0); HALIFAX=(-63.57,44.65); WINNIPEG=(-97.14,49.9); VANCOUVER=(-123.12,49.28)
SEATTLE=(-122.33,47.6); ALBANY=(-73.75,42.65); BALTIMORE=(-76.61,39.29); BOSTON=(-71.06,42.36); NY=(-74.0,40.7)
EDMONTON=(-113.5,53.5); MINNEAPOLIS=(-93.27,44.98); NUUK=(-51.7,64.18)
COLONIAS13 = [(-67,45),(-70,41.6),(-74,40.5),(-75.5,38.5),(-76,35),(-78,33.8),(-81,32),(-81.5,30.7),(-82.5,31),(-83.5,34.5),(-80.5,37),(-79.5,39.7),(-80.5,42),(-79,43),(-76.5,43.5),(-74.7,45),(-71.5,45),(-70,46.7),(-69,47.4),(-67.8,47)]
OREGON = [(-124.4,42),(-111,42),(-111,49),(-116,52),(-120,54.67),(-130.5,54.67),(-133,54.2),(-128,50),(-125,48.4),(-124.6,46.2)]
FRONTEIRA = [(-123.3,49.0),(-95.15,49.0),(-89.5,48.0),(-84.5,46.5),(-82.4,43.0),(-79,43.2),(-76.5,43.5),(-74.7,45),(-71.5,45),(-70,46.7),(-69,47.4),(-67.8,47),(-67,45)]
PASSAGEM = [(-60,74.5),(-80,74.2),(-95,74.2),(-110,72.5),(-125,71.5),(-140,70.6),(-160,71.5),(-168.5,66.2)]

beats = {}
# ---- 1. The 51st State
beats["b01"] = {"cenas": [
  {"tipo":"mapa","de":V(-60,30,1.3),"para":V(-90,48,3.2),"ano":"2025","paises":[{"iso":"CAN","cor":"#ffd400","em":"Canada"}],"atores":[
     A("retrato",(-77,36),img="trump",nome="TRUMP",em="President"),
     A("fala",(-77,36),texto="THE 51ST STATE!",em="fifty-first"),
     A("bandeira",OTTAWA,pais="CAN",em="leaders"),
     A("fala",OTTAWA,texto="NOT FOR SALE.",em="sale")]},
]}
beats["b02"] = {"cenas": [
  {"tipo":"mapa","para":V(-98,47,3.6),"rotas":[R(FRONTEIRA,cor="#ffd400",em="longest",dur=70,contador={"ate":5525,"sufixo":"MILES"})],"atores":[
     A("icone",(-100,44),emoji="🤝",rotulo="FRIENDLY NEIGHBORS",em="friendly"),
     A("icone",(-80,51),emoji="🪖",rotulo="ALMOST NO SOLDIERS",em="soldiers")]},
]}
beats["b03"] = {"cenas": [
  {"tipo":"mapa","para":V(-98,54,2.4),"paises":[{"iso":"CAN","bandeira":"CAN","em":"second"}],"atores":[
     A("preco",(-110,63),valor=40000000,prefixo="",sufixo="PEOPLE",cor="#d52b1e",em="forty"),
     A("preco",(-100,36),valor=340000000,prefixo="",sufixo="IN THE US",cor="#012169",em="fewer"),
     A("rotulo",(-90,46.6),texto="MOST CANADIANS LIVE HERE",cor="#ffd400",em="hundred")]},
]}
beats["b04"] = {"cenas": [
  {"tipo":"mapa","para":V(-92,47,3.2),"titulo":"WHY AMERICA TRIED\nTO CONQUER CANADA","som":"impacto","paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"USA","bandeira":"USA"}]},
  {"em":"tried","tipo":"linhaTempo","itens":[{"data":"1775","texto":"Invasion of Quebec"},{"data":"1812","texto":"War of 1812"},{"data":"1844","texto":"54°40' or fight"},{"data":"1930","texto":"War Plan Red"},{"data":"2025","texto":"\"The 51st state\""}]},
]}
# ---- 2. The Fourteenth Colony
beats["b05"] = {"cenas": [
  {"tipo":"mapa","para":V(-73,42,7),"ano":"1775","zonas":[Z(COLONIAS13,bandeira="USA",em="Revolution")],"paises":[{"iso":"CAN","bandeira":"GBR","em":"Canada"}],"atores":[
     A("rotulo",(-79,39),texto="13 COLONIES",cor="#ffd400",em="rebels"),
     A("icone",QUEBEC,emoji="🏰",rotulo="QUEBEC",em="Quebec")]},
]}
beats["b06"] = {"cenas": [
  {"tipo":"mapa","para":V(-72,44.5,11),"paises":[{"iso":"CAN","bandeira":"GBR"}],"rotas":[
     R([ALBANY,(-73.4,44.5),MONTREAL,QUEBEC],icone="navio",pais="USA",cor="#ffffff",em="Champlain",dur=60),
     R([(-69.8,43.9),(-69.9,45.2),(-70.6,46.2),QUEBEC],cor="#ffd400",tracejada=True,em="dragged",dur=60)],"atores":[
     A("rotulo",(-69.2,45.2),texto="ARNOLD'S MARCH",cor="#ffd400",em="Maine"),
     A("icone",(-71.9,47.5),emoji="🌨️",rotulo="BLIZZARD",em="blizzard"),
     A("icone",QUEBEC,icone="explosao",em="attacked"),
     A("foto",(-75.8,46.3),img="montgomery",rotulo="DEATH OF GEN. MONTGOMERY",em="killed"),
     A("carimbo",(-72.5,43.2),texto="FAILED",em="collapsed")]},
]}
beats["b07"] = {"cenas": [
  {"tipo":"mapa","para":V(-71,46,10),"paises":[{"iso":"CAN","bandeira":"GBR"}],"rotas":[
     R([(-60,47),(-66,49.3),(-69.5,48),QUEBEC],icone="navio",pais="GBR",cor="#ffffff",em="reinforcements",dur=60),
     R([QUEBEC,MONTREAL,(-73.4,44.5),ALBANY],cor="#e63946",tracejada=True,em="retreated",dur=50)],"atores":[
     A("icone",(-72.2,45.0),emoji="🦠",rotulo="SMALLPOX",em="Smallpox")]},
]}
beats["b08"] = {"cenas": [
  {"tipo":"mapa","para":V(-73,43,9),"atores":[
     A("retrato",(-73,43.6),img="arnold",nome="BENEDICT ARNOLD",em="Benedict"),
     A("bandeira",(-67.3,43.6),pais="GBR",em="switched"),
     A("carimbo",(-72.8,41.6),texto="TRAITOR",em="traitor")]},
]}
beats["b09"] = {"cenas": [
  {"tipo":"mapa","para":V(-74,44,6),"zonas":[Z(COLONIAS13,bandeira="USA")],"paises":[{"iso":"CAN","bandeira":"GBR"}],"atores":[
     A("icone",(-78,38),icone="documento",rotulo="ARTICLES OF\nCONFEDERATION",em="Articles"),
     A("carimbo",(-72,48),texto="OPEN INVITATION",cor="#1fa45b",em="join"),
     A("bandeira",OTTAWA,pais="GBR",em="never"),
     A("reacao",OTTAWA,emoji="🙅",em="yes")]},
]}
beats["b10"] = {"cenas": [
  {"tipo":"mapa","para":V(-72,44,6.5),"zonas":[Z(COLONIAS13,bandeira="USA")],"paises":[{"iso":"CAN","bandeira":"GBR"}],"rotas":[
     R([NY,(-74,43),(-76,44.6)],cor="#ffd400",em="loyal",dur=45),
     R([BOSTON,(-67,44),(-65.5,45.3)],cor="#ffd400",em="fled",dur=45)],"atores":[
     A("preco",(-81,47),valor=40000,prefixo="~",sufixo="LOYALISTS",cor="#012169",em="tens"),
     A("icone",(-66,46.5),emoji="👑",rotulo="LOYAL TO THE KING",em="king")]},
]}
# ---- 3. A Mere Matter of Marching
beats["b11"] = {"cenas": [
  {"tipo":"mapa","para":V(-50,44,2.4),"ano":"1812","paises":[{"iso":"USA","bandeira":"USA"},{"iso":"CAN","bandeira":"GBR","em":"Canada"},{"iso":"FRA","bandeira":"FRA","em":"Napoleon"}],"atores":[
     A("retrato",(-82,36),img="madison",nome="JAMES MADISON",em="declared"),
     A("icone",(-74,47),icone="explosao",rotulo="INVADE!",em="invade"),
     A("icone",(2.3,48.8),emoji="⚔️",rotulo="BUSY WITH NAPOLEON",em="busy")]},
]}
beats["b12"] = {"cenas": [
  {"tipo":"mapa","para":V(-78,43,6),"paises":[{"iso":"CAN","bandeira":"GBR"}],"atores":[
     A("retrato",(-79,39),img="jefferson",nome="JEFFERSON",em="Jefferson"),
     A("fala",(-79,39),texto="A MERE MATTER OF MARCHING.",em="mere"),
     A("reacao",(-79,39),emoji="😎",em="marching")]},
]}
beats["b13"] = {"cenas": [
  {"tipo":"mapa","para":V(-81,43,8),"paises":[{"iso":"CAN","bandeira":"GBR"}],"atores":[
     A("icone",DETROIT,emoji="🏳️",rotulo="DETROIT",em="Detroit"),
     A("carimbo",(-83,40.6),texto="SURRENDERED",em="surrendered"),
     A("icone",(-79.1,43.1),icone="explosao",em="Attack"),
     A("icone",(-74.9,45.0),icone="explosao",em="border"),
     A("reacao",(-79.1,43.1),emoji="❌",em="failed")]},
]}
beats["b14"] = {"cenas": [
  {"tipo":"mapa","para":V(-84,42,7),"paises":[{"iso":"CAN","bandeira":"GBR"}],"atores":[
     A("bandeira",(-80,44.5),pais="GBR",em="British"),
     A("icone",(-85.5,42.5),emoji="🪶",rotulo="TECUMSEH",em="Tecumseh"),
     A("fala",(-85.5,42.5),texto="STOP THE SETTLERS.",em="settlers")]},
]}
beats["b15"] = {"cenas": [
  {"tipo":"mapa","para":V(-79.4,43.7,22),"ano":"1813","paises":[{"iso":"CAN","bandeira":"GBR"}],"atores":[
     A("icone",YORK,emoji="🔥",rotulo="YORK (TORONTO)",em="York")]},
  {"em":"revenge","tipo":"mapa","para":V(-77,38.9,22),"ano":"1814","paises":[{"iso":"USA","bandeira":"USA"}],"rotas":[R([(-76.4,38.3),(-76.7,38.7),DC],icone="navio",pais="GBR",cor="#ffffff",em="marched",dur=45)],"atores":[
     A("foto",(-80.2,39.3),img="washington-fogo",rotulo="WASHINGTON BURNS, 1814",em="fire"),
     A("icone",(-76.3,38.6),emoji="🏛️",rotulo="WHITE HOUSE",em="White"),
     A("reacao",(-76.3,38.6),emoji="🔥",em="flee")]},
]}
beats["b16"] = {"cenas": [
  {"tipo":"mapa","para":V(-76.6,39.2,30),"paises":[{"iso":"USA","bandeira":"USA"}],"rotas":[R([(-76.0,38.6),(-76.4,39.15),BALTIMORE],icone="navio",pais="GBR",cor="#ffffff",em="attacked",dur=40)],"atores":[
     A("icone",(-76.58,39.26),emoji="🏰",rotulo="FORT McHENRY",em="Baltimore"),
     A("reacao",(-76.58,39.26),emoji="💥",em="bombardment"),
     A("icone",(-77.5,39.65),emoji="🎶",rotulo="STAR-SPANGLED BANNER",em="anthem")]},
]}
beats["b17"] = {"cenas": [
  {"tipo":"mapa","para":V(-82,45,4.5),"ano":"1814","paises":[{"iso":"USA","bandeira":"USA"},{"iso":"CAN","bandeira":"GBR"}],"rotas":[R(FRONTEIRA,cor="#ffd400",em="border",dur=50)],"atores":[
     A("icone",(-84,39),icone="documento",rotulo="TREATY OF GHENT",em="treaty"),
     A("preco",(-74,50),valor=0,prefixo="",sufixo="MILES GAINED",cor="#ffd400",em="exactly")]},
]}
# ---- 4. Fifty-Four Forty
beats["b18"] = {"cenas": [
  {"tipo":"mapa","para":V(-122,50,6),"ano":"1844","zonas":[Z(OREGON,cor="#ffd400",em="Pacific")],"rotas":[R([(-136,54.67),(-120,54.67)],cor="#e63946",tracejada=True,em="slogan",dur=40)],"atores":[
     A("rotulo",(-128,56.2),texto="54°40'",cor="#e63946",em="fifty-four"),
     A("rotulo",(-133,59.5),texto="RUSSIAN ALASKA",em="Russian"),
     A("bandeira",(-116,46),pais="USA",em="American"),
     A("fala",(-116,46),texto="54°40' OR FIGHT!",em="slogan")]},
]}
beats["b19"] = {"cenas": [
  {"tipo":"mapa","para":V(-118,49,6),"zonas":[Z(OREGON,cor="#ffd400")],"rotas":[R([(-123.3,49.0),(-110,49.0)],cor="#ffffff",em="forty-ninth",dur=40)],"atores":[
     A("bandeira",(-112,44),pais="USA",em="Polk"),
     A("rotulo",(-112,46.2),texto="PRESIDENT POLK",em="Polk"),
     A("icone",(-106,41),emoji="⚔️",rotulo="WAR WITH MEXICO",em="Mexico"),
     A("rotulo",(-117.5,49.6),texto="49TH PARALLEL",cor="#ffffff",em="forty-ninth"),
     A("icone",(-125,52.5),icone="acordo",rotulo="1846",em="compromise")]},
]}
beats["b20"] = {"cenas": [
  {"tipo":"mapa","para":V(-100,56,2.3),"ano":"1867","paises":[{"iso":"CAN","bandeira":"CAN","em":"united"},{"iso":"USA","bandeira":"USA"},{"iso":"USA","cor":"#ffd400","perto":[-150,64],"em":"Alaska"}],"atores":[
     A("icone",(-150,64),icone="dinheiro",rotulo="ALASKA BOUGHT",em="bought"),
     A("bandeira",OTTAWA,pais="CAN",em="united"),
     A("reacao",OTTAWA,emoji="😬",em="squeezed")]},
]}
beats["b21"] = {"cenas": [
  {"tipo":"mapa","para":V(-77,44,8),"paises":[{"iso":"CAN","bandeira":"CAN"}],"rotas":[
     R([(-78.9,42.9),(-79.1,43.15)],icone="aviao",cor="#1fa45b",em="raids",dur=30),
     R([(-73.2,44.9),(-73.2,45.3)],cor="#1fa45b",em="Fenians",dur=30)],"atores":[
     A("icone",(-80.5,41.5),emoji="☘️",rotulo="FENIAN RAIDS",em="Irish"),
     A("carimbo",(-75,47.3),texto="BEATEN BACK",em="beaten")]},
]}
# ---- 5. War Plan Red
beats["b22"] = {"cenas": [
  {"tipo":"mapa","para":V(-92,52,2.8),"ano":"1930","paises":[{"iso":"CAN","cor":"#b3001b","em":"Crimson"},{"iso":"USA","bandeira":"USA"}],"atores":[
     A("icone",(-80,36),icone="documento",rotulo="WAR PLAN RED",em="secret"),
     A("carimbo",(-95,42),texto="SECRET",em="Red"),
     A("rotulo",(-100,58),texto="CODE NAME: CRIMSON",cor="#ffffff",em="Crimson")]},
]}
beats["b23"] = {"cenas": [
  {"tipo":"mapa","para":V(-78,46,5),"paises":[{"iso":"CAN","cor":"#b3001b"}],"rotas":[
     R([(-68.5,45),(-65.5,44.9),HALIFAX],icone="aviao",cor="#e63946",em="Halifax",dur=35),
     R([(-73.3,44.8),MONTREAL],icone="aviao",cor="#e63946",em="Montreal",dur=35),
     R([(-71.2,45.0),QUEBEC],icone="aviao",cor="#e63946",em="Quebec",dur=35),
     R([(-82.9,42.3),YORK],icone="aviao",cor="#e63946",em="Lakes",dur=35)],"atores":[
     A("icone",(-66,47.5),emoji="🚂",rotulo="CUT THE RAILWAYS",em="railways")]},
]}
beats["b24"] = {"cenas": [
  {"tipo":"mapa","para":V(-98,46,3),"ano":"1921","paises":[{"iso":"CAN","bandeira":"CAN"}],"rotas":[
     R([VANCOUVER,SEATTLE],icone="aviao",cor="#d52b1e",em="Seattle",dur=30),
     R([WINDSOR,DETROIT],icone="aviao",cor="#d52b1e",em="Detroit",dur=30),
     R([MONTREAL,ALBANY],icone="aviao",cor="#d52b1e",em="Albany",dur=30)],"atores":[
     A("icone",(-105,56),icone="documento",rotulo="DEFENCE SCHEME No. 1",em="Defence"),
     A("rotulo",(-104,53),texto="'BUSTER' BROWN",em="Brown")]},
]}
beats["b25"] = {"cenas": [
  {"tipo":"mapa","para":V(-85,47,3),"paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"USA","bandeira":"USA"}],"atores":[
     A("icone",(-95,55),icone="documento",rotulo="NEVER USED",em="Neither"),
     A("icone",(-78,38),icone="alerta",rotulo="REAL ENEMY: GERMANY",em="Germany"),
     A("carimbo",(-88,47),texto="DECLASSIFIED 1974",cor="#1fa45b",em="1974")]},
]}
beats["b26"] = {"cenas": [
  {"tipo":"mapa","para":V(-90,47,4),"ano":"1935","paises":[{"iso":"CAN","cor":"#b3001b"}],"atores":[
     A("icone",(-96,51),emoji="☠️",rotulo="POISON GAS",em="poison"),
     A("icone",(-97,46.5),emoji="✈️",rotulo="'CIVILIAN' AIRFIELD",em="airfields"),
     A("icone",(-84,46.8),emoji="✈️",rotulo="'CIVILIAN' AIRFIELD",em="border"),
     A("reacao",(-84,46.8),emoji="🤫",em="disguised")]},
]}
# ---- 6. Why Now
beats["b27"] = {"cenas": [
  {"tipo":"mapa","para":V(-88,46,4.2),"paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"USA","bandeira":"USA"}],"rotas":[
     R([(-79,47),(-82,40)],icone="dinheiro",cor="#1fa45b",em="trade",dur=40),R([(-95,41),(-97,51)],icone="dinheiro",cor="#1fa45b",em="year",dur=40)],"atores":[
     A("preco",(-88,54),valor=909000000000,rotulo="TRADE PER YEAR",em="nine"),
     A("icone",(-100,40),emoji="🚗",rotulo="CARS",em="Cars"),
     A("icone",(-77,41.5),emoji="⚡",rotulo="ELECTRICITY",em="electricity")]},
]}
beats["b28"] = {"cenas": [
  {"tipo":"mapa","para":V(-83,42.3,30),"paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"USA","bandeira":"USA"}],"rotas":[R([(-83.3,42.15),(-82.85,42.45)],icone="navio",cor="#ffffff",em="carries",dur=40)],"atores":[
     A("icone",(-83.07,42.31),emoji="🌉",rotulo="AMBASSADOR BRIDGE",em="Ambassador"),
     A("preco",(-81.8,43.0),valor=25,prefixo="~",sufixo="% OF ALL TRADE",cor="#ffd400",em="quarter")]},
  {"em":"dams","tipo":"mapa","para":V(-73,46,6),"paises":[{"iso":"CAN","bandeira":"CAN"}],"rotas":[R([(-71,52),(-73.5,45.6),NY],cor="#ffd400",em="electricity",dur=50)],"atores":[
     A("icone",(-71,52),emoji="⚡",rotulo="QUEBEC DAMS",em="dams"),
     A("icone",NY,emoji="🏙️",rotulo="NEW YORK",em="York")]},
]}
beats["b29"] = {"cenas": [
  {"tipo":"mapa","para":V(-102,46,3.5),"paises":[{"iso":"CAN","bandeira":"CAN"}],"rotas":[R([EDMONTON,(-104,49),(-97,42),(-90,38)],cor="#111111",em="crude",dur=50)],"atores":[
     A("icone",EDMONTON,icone="petroleo",rotulo="ALBERTA OIL",em="oil"),
     A("preco",(-88,37),valor=60,prefixo="~",sufixo="% OF US OIL IMPORTS",cor="#ffd400",em="sixty")]},
]}
beats["b30"] = {"cenas": [
  {"tipo":"mapa","para":V(-95,58,3.4),"paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"GRL","bandeira":"GRL","em":"Greenland"},{"iso":"USA","bandeira":"USA","perto":[-150,64],"em":"Alaska"}],"rotas":[R(PASSAGEM,icone="navio",cor="#ffffff",em="route",dur=90)],"atores":[
     A("icone",(-80,62),emoji="🧊",rotulo="ICE MELTING",em="melts"),
     A("bandeira",(-95,70),pais="CAN",em="Canadian"),
     A("fala",(-95,70),texto="OUR WATERS.",em="Canadian"),
     A("bandeira",(-118,58),pais="USA",em="Washington"),
     A("fala",(-118,58),texto="INTERNATIONAL!",em="international")]},
]}
beats["b31"] = {"cenas": [
  {"tipo":"mapa","para":V(-88,46,4.2),"ano":"2025","paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"USA","bandeira":"USA"}],"atores":[
     A("preco",(-90,40),valor=25,prefixo="",sufixo="% TARIFFS",cor="#e63946",em="tariffs"),
     A("icone",(-79.4,43.65),emoji="🏒",rotulo="BOOS AT HOCKEY GAMES",em="booed"),
     A("icone",(-97,50.5),emoji="🛒",rotulo="BUY CANADIAN",em="stopped"),
     A("icone",(-73,49),emoji="🥶",rotulo="FRIENDSHIP FROZEN",em="cold")]},
  {"em":"When","tipo":"mapa","para":V(-77,39,14),"paises":[{"iso":"USA","bandeira":"USA"}],"atores":[
     A("icone",DC,emoji="🏛️",rotulo="WHITE HOUSE",em="White"),
     A("bandeira",(-75.6,40.2),pais="CAN",em="prime"),
     A("fala",(-75.6,40.2),texto="SOME PLACES ARE NEVER FOR SALE.",em="never")]},
]}
# ---- 7. The Pattern
beats["b32"] = {"cenas": [
  {"tipo":"mapa","para":V(-70,40,1.5),"paises":[{"iso":"GRL","bandeira":"GRL","em":"Greenland"},{"iso":"PAN","bandeira":"PAN","em":"Panama"},{"iso":"CAN","bandeira":"CAN","em":"Canada."}],"atores":[
     A("icone",(-42,72),emoji="🧊",rotulo="GREENLAND",em="Greenland"),
     A("icone",(-79.7,9.2),icone="ancora",rotulo="PANAMA CANAL",em="Panama"),
     A("icone",(-100,58),emoji="🍁",rotulo="CANADA",em="Canada."),
     A("rotulo",(-60,25),texto="MORE LAND. MORE ROUTES.",cor="#ffd400",em="control")]},
]}
beats["b33"] = {"cenas": [
  {"tipo":"mapa","para":V(-92,47,3.4),"paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"USA","bandeira":"USA"}],"rotas":[R(FRONTEIRA,cor="#ffffff",em="open",dur=60)],"atores":[
     A("carimbo",(-95,55),texto="FORCE FAILED",em="failed"),
     A("icone",(-85,45),emoji="🤝",rotulo="TRADE + TRUST",em="trade"),
     A("preco",(-100,40),valor=0,prefixo="",sufixo="SHOTS SINCE 1814",cor="#1fa45b",em="single")]},
]}
beats["b34"] = {"cenas": [
  {"tipo":"mapa","de":V(-92,47,3.4),"para":V(-70,35,1.2),"paises":[{"iso":"CAN","bandeira":"CAN"},{"iso":"GRL","bandeira":"GRL","em":"Greenland"},{"iso":"PAN","bandeira":"PAN","em":"Panama"}],"atores":[
     A("rotulo",(-45,62),texto="WATCH NEXT",cor="#ffd400",em="watch")]},
  {"em":"subscribe","tipo":"final"},
]}

CHAVES = ["Canada","Quebec","Arnold","Detroit","Toronto","Washington","Baltimore","Britain","British","Napoleon","Jefferson","Polk","Alaska","Crimson","Red","secret","oil","Arctic","tariffs","traitor","Tecumseh","Fenians","Greenland","Panama","sale","force","trade"]
sb = {"titulo":"Why America Tried to Conquer Canada","idioma":"en","estilo":"mapa","trilha":"trilha-mapa","chaves":CHAVES,"beats":beats}
json.dump(sb, open(sys.argv[1],"w"), ensure_ascii=False, indent=1)
print(len(beats),"beats",sum(len(b["cenas"]) for b in beats.values()),"cenas")
