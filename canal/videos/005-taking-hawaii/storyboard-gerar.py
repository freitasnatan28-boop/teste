import json, sys
# Storyboard do vídeo 005 (Havaí). Uso: python3 storyboard-gerar.py storyboard.json
def V(lon, lat, z): return {"centro": [lon, lat], "zoom": z}
def Z(p, **k): return {"pontos": [list(x) for x in p], **k}
def A(tipo, lonlat, **k): return {"tipo": tipo, "lonlat": list(lonlat), **k}
def R(pontos, **k): return {"pontos": [list(x) for x in pontos], **k}

HNL=(-157.86,21.31); PEARL=(-157.97,21.36); PALACIO=(-157.858,21.307); KEALA=(-155.92,19.48); KAUAI=(-159.5,22.05)
MAUI=(-156.3,20.8); BIG=(-155.5,19.6); LAHAINA=(-156.68,20.88); SF=(-122.42,37.77); DC=(-77.04,38.9); BOSTON=(-71.06,42.36)
TOKYO=(139.7,35.7); MANILA=(120.98,14.6); SYDNEY=(151.2,-33.87); SHANGHAI=(121.47,31.23); TAHITI=(-149.4,-17.6)
MADEIRA=(-16.9,32.65); LONDON=(-0.13,51.5); PARIS=(2.35,48.85)
HAWAII = [-157.3,20.6]   # "perto": escolhe as ilhas do Havaí dentro dos EUA
ILHAS = V(-157.3,20.45,40)
PAC = V(-165,22,1.55)

def havai(**k): return {"iso":"USA","perto":HAWAII,**k}

beats = {}
# ---- 1. A Kingdom in the Pacific
beats["b01"] = {"cenas": [
  {"tipo":"mapa","de":V(-100,25,1.3),"para":V(-140,28,2.6),"paises":[havai(cor="#e63946",em="islands")],"rotas":[R([SF,HNL],cor="#ffd400",tracejada=True,em="California",dur=60,contador={"ate":2400,"sufixo":"MILES"})],"atores":[
     A("rotulo",(-122.4,40.5),texto="CALIFORNIA",em="California"),
     A("icone",(-157.5,24.5),emoji="👑",rotulo="A KINGDOM",em="king")]},
  {"em":"treaties","tipo":"mapa","para":ILHAS,"paises":[havai(cor="#e63946")],"atores":[
     A("icone",(-159.9,22.6),icone="documento",rotulo="TREATIES",em="treaties")]},
]}
beats["b02"] = {"cenas": [
  {"tipo":"mapa","para":ILHAS,"paises":[havai(cor="#e63946")],"atores":[
     A("icone",(-159.6,21.0),emoji="🏛️",rotulo="EMBASSIES",em="embassies"),
     A("icone",(-155.6,21.6),icone="documento",rotulo="CONSTITUTION",em="constitution"),
     A("icone",(-157.4,19.2),emoji="📚",rotulo="HIGH LITERACY",em="literacy")]},
]}
beats["b03"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"ano":"1893","paises":[havai(cor="#e63946")],"atores":[
     A("retrato",(-158.35,21.6),img="liliuokalani",nome="QUEEN LILIUOKALANI",em="queen"),
     A("icone",(-157.6,21.55),emoji="💼",rotulo="BUSINESSMEN",em="businessmen"),
     A("icone",(-157.5,21.15),emoji="⚓",rotulo="US MARINES",em="Marines"),
     A("carimbo",(-157.9,21.0),texto="OVERTHROWN",em="removed")]},
  {"em":"Five","tipo":"mapa","para":ILHAS,"ano":"1898","paises":[havai(cor="#2f6fde",em="belonged")]},
]}
beats["b04"] = {"cenas": [
  {"tipo":"mapa","para":V(-77.04,38.9,20),"ano":"1993","paises":[{"iso":"USA","bandeira":"USA"}],"atores":[
     A("icone",DC,icone="documento",rotulo="CONGRESS",em="Congress"),
     A("carimbo",(-77,37.6),texto="APOLOGY",cor="#1fa45b",em="apologized")]},
  {"em":"So","tipo":"mapa","para":V(-150,24,2.6),"titulo":"HOW AMERICA\nTOOK HAWAII","som":"impacto","paises":[havai(cor="#e63946"),{"iso":"USA","bandeira":"USA"}]},
]}
# ---- 2. The Crossroads of the Pacific
beats["b05"] = {"cenas": [
  {"tipo":"mapa","para":PAC,"paises":[havai(cor="#ffd400",em="Hawaii")],"rotas":[
     R([SF,HNL,TOKYO],icone="navio",cor="#ffffff",em="voyage",dur=70),
     R([SF,HNL,SYDNEY],cor="#ffd400",tracejada=True,em="Pacific",dur=60),
     R([SF,HNL,SHANGHAI],cor="#ffd400",tracejada=True,em="coal",dur=60)],"atores":[
     A("rotulo",(-157.5,26),texto="HALFWAY",cor="#ffd400",em="Halfway"),
     A("icone",(-150,14),emoji="⛽",rotulo="WATER · FOOD · COAL",em="water"),
     A("icone",(-157.8,30.5),emoji="🐋",rotulo="WHALING PORTS",em="Whaling")]},
]}
beats["b06"] = {"cenas": [
  {"tipo":"mapa","para":V(-153,5,3.2),"ano":"1778","paises":[havai(cor="#e63946")],"rotas":[R([TAHITI,(-155,5),KAUAI],icone="navio",pais="GBR",cor="#ffffff",em="Cook",dur=60)],"atores":[
     A("icone",(-145,14),emoji="🧭",rotulo="CAPTAIN COOK",em="explorer"),
     A("icone",(-147,24),emoji="🐋",rotulo="WHALERS",em="whalers")]},
]}
beats["b07"] = {"cenas": [
  {"tipo":"mapa","para":V(-155.7,19.6,60),"ano":"1779","paises":[havai(cor="#e63946")],"atores":[
     A("icone",KEALA,icone="explosao",rotulo="KEALAKEKUA BAY",em="killed"),
     A("rotulo",(-155.4,20.25),texto="THE BIG ISLAND",em="Big")]},
]}
beats["b08"] = {"cenas": [
  {"tipo":"mapa","para":ILHAS,"ano":"1810","paises":[havai(cor="#e63946",em="united")],"atores":[
     A("icone",(-160.6,20.9),emoji="👑",rotulo="KAMEHAMEHA",em="Kamehameha"),
     A("bandeira",(-155.3,21.7),pais="HAW",em="flag"),
     A("rotulo",(-155.3,21.15),texto="UNION JACK + 8 STRIPES",em="Union")]},
]}
beats["b09"] = {"cenas": [
  {"tipo":"mapa","para":V(-100,5,1.25),"ano":"1820","paises":[havai(cor="#e63946")],"rotas":[R([BOSTON,(-40,0),(-67.3,-56.6),(-80,-20),(-120,0),HNL],icone="navio",pais="USA",cor="#ffffff",em="arrived",dur=90)],"atores":[
     A("icone",BOSTON,emoji="⛪",rotulo="MISSIONARIES",em="missionaries"),
     A("icone",(-157.9,26),emoji="📖",rotulo="SCHOOLS",em="schools")]},
]}
# ---- 3. Sugar
beats["b10"] = {"cenas": [
  {"tipo":"mapa","para":V(-145,28,2.6),"paises":[havai(cor="#e63946"),{"iso":"USA","bandeira":"USA","em":"market"}],"rotas":[R([HNL,SF],icone="navio",cor="#ffffff",em="market",dur=60)],"atores":[
     A("foto",(-152,35),img="acucar",rotulo="SUGAR PLANTATION",em="sugar"),
     A("icone",(-157.8,17),icone="dinheiro",rotulo="RICH",em="rich")]},
]}
beats["b11"] = {"cenas": [
  {"tipo":"mapa","para":V(-150,25,1.3),"paises":[havai(cor="#e63946")],"rotas":[
     R([SHANGHAI,HNL],cor="#ffd400",tracejada=True,em="China",dur=40),
     R([TOKYO,HNL],cor="#ffd400",tracejada=True,em="Japan",dur=40),
     R([MADEIRA,(-40,10),(-67.3,-56.6),(-110,0),HNL],cor="#ffd400",tracejada=True,em="Portugal",dur=40),
     R([MANILA,HNL],cor="#ffd400",tracejada=True,em="Philippines",dur=40)],"atores":[
     A("rotulo",(-157.8,27),texto="LABORERS",cor="#ffd400",em="laborers"),
     A("icone",(-157.8,15),emoji="🦠",rotulo="DISEASES",em="diseases")]},
]}
beats["b12"] = {"cenas": [
  {"tipo":"mapa","para":ILHAS,"paises":[havai(cor="#e63946")],"atores":[
     A("preco",(-159.3,21.3),valor=300000,prefixo="~",sufixo="BEFORE COOK",cor="#1fa45b",em="three"),
     A("preco",(-155.5,21.3),valor=40000,prefixo="",sufixo="A CENTURY LATER",cor="#e63946",em="forty"),
     A("rotulo",(-157.3,19.1),texto="A MINORITY IN THEIR OWN LAND",cor="#ffd400",em="minority")]},
]}
beats["b13"] = {"cenas": [
  {"tipo":"mapa","para":V(-140,30,2.6),"ano":"1875","paises":[havai(cor="#e63946"),{"iso":"USA","bandeira":"USA"}],"rotas":[R([HNL,SF],icone="navio",cor="#1fa45b",em="tax-free",dur=50)],"atores":[
     A("icone",(-120,26),icone="documento",rotulo="RECIPROCITY TREATY",em="deal"),
     A("preco",(-140,38),valor=0,prefixo="$",sufixo="TAX ON SUGAR",cor="#1fa45b",em="tax-free")]},
  {"em":"harbor","tipo":"mapa","para":V(-157.95,21.38,110),"paises":[havai(cor="#e63946")],"atores":[
     A("icone",PEARL,icone="ancora",rotulo="PEARL HARBOR",em="Pearl")]},
]}
# ---- 4. The Bayonet Constitution
beats["b14"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"paises":[havai(cor="#e63946")],"atores":[
     A("retrato",(-158.3,21.55),img="kalakaua",nome="KING KALAKAUA",em="Kalakaua"),
     A("icone",(-157.5,21.55),emoji="💡",rotulo="ELECTRIC LIGHTS",em="electric"),
     A("fala",(-158.3,21.55),texto="BEFORE THE WHITE HOUSE!",em="White")]},
  {"em":"1881","tipo":"mapa","para":V(10,25,1.15),"ano":"1881","rotas":[R([HNL,TOKYO,(80,10),(32,30),PARIS,LONDON,(-74,40.7),SF,HNL],icone="navio",pais="HAW",cor="#ffd400",em="first",dur=110)],"atores":[
     A("rotulo",(10,-5),texto="FIRST KING AROUND THE WORLD",cor="#ffd400",em="around")]},
]}
beats["b15"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"ano":"1887","paises":[havai(cor="#e63946")],"atores":[
     A("icone",(-157.55,21.6),emoji="🔫",rotulo="ARMED MILITIA",em="militia"),
     A("icone",(-158.3,21.6),icone="documento",rotulo="NEW CONSTITUTION",em="constitution"),
     A("carimbo",(-157.9,21.15),texto="SIGN IT",em="sign"),
     A("rotulo",(-157.9,21.85),texto="THE BAYONET CONSTITUTION",cor="#ffd400",em="Bayonet")]},
]}
# ---- 5. The Overthrow
beats["b16"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"ano":"1891","paises":[havai(cor="#e63946")],"atores":[
     A("retrato",(-158.3,21.55),img="liliuokalani",nome="QUEEN LILIUOKALANI",em="Liliuokalani"),
     A("fala",(-158.3,21.55),texto="POWER BACK TO MY PEOPLE.",em="restore")]},
]}
beats["b17"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"paises":[havai(cor="#e63946")],"atores":[
     A("retrato",(-158.3,21.55),img="liliuokalani",nome="QUEEN LILIUOKALANI"),
     A("icone",(-157.5,21.55),emoji="🎵",rotulo="ALOHA 'OE",em="songwriter")]},
]}
beats["b18"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"ano":"1893","paises":[havai(cor="#e63946")],"rotas":[R([(-157.95,20.9),(-157.88,21.28)],icone="navio",pais="USA",cor="#ffffff",em="Boston",dur=40)],"atores":[
     A("preco",(-158.4,21.75),valor=13,prefixo="",sufixo="MEN",cor="#e63946",em="thirteen"),
     A("rotulo",(-158.4,21.5),texto="COMMITTEE OF SAFETY",em="Committee"),
     A("preco",(-157.4,21.75),valor=162,prefixo="~",sufixo="MARINES & SAILORS",cor="#012169",em="sixty"),
     A("rotulo",(-157.7,21.05),texto="USS BOSTON",em="Boston"),
     A("icone",(-157.6,21.4),emoji="🤫",rotulo="NO SHOTS FIRED",em="shot")]},
]}
beats["b19"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"paises":[havai(cor="#e63946")],"atores":[
     A("retrato",(-158.3,21.55),img="liliuokalani",nome="QUEEN LILIUOKALANI",em="queen"),
     A("fala",(-158.3,21.55),texto="TO AVOID BLOODSHED...",em="bloodshed"),
     A("bandeira",(-157.45,21.6),pais="USA",em="United"),
     A("reacao",(-157.45,21.6),emoji="🤞",em="hoping")]},
]}
beats["b20"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"ano":"1894","paises":[havai(cor="#e63946")],"atores":[
     A("retrato",(-158.3,21.55),img="dole",nome="SANFORD DOLE",em="Sanford"),
     A("icone",(-157.5,21.55),emoji="🍍",rotulo="DOLE PINEAPPLES",em="pineapple")]},
]}
# ---- 6. An Act of War
beats["b21"] = {"cenas": [
  {"tipo":"mapa","para":V(-115,30,2.2),"paises":[{"iso":"USA","bandeira":"USA"},havai(cor="#e63946")],"rotas":[R([DC,SF,HNL],cor="#ffffff",tracejada=True,em="investigator",dur=60)],"atores":[
     A("retrato",(-80,38.9),img="cleveland",nome="GROVER CLEVELAND",em="Cleveland"),
     A("icone",(-157.8,25.5),icone="documento",rotulo="BLOUNT REPORT",em="Blount"),
     A("carimbo",(-140,18),texto="NOT WITHOUT THE MARINES",em="marines")]},
]}
beats["b22"] = {"cenas": [
  {"tipo":"mapa","para":V(-100,36,4),"paises":[{"iso":"USA","bandeira":"USA"}],"atores":[
     A("retrato",(-80,38.5),img="cleveland",nome="GROVER CLEVELAND"),
     A("fala",(-80,38.5),texto="AN ACT OF WAR.",em="war"),
     A("icone",(-98,36),icone="documento",rotulo="CONGRESS",em="Cleveland"),
     A("reacao",(-98,36),emoji="🤐",em="would")]},
]}
beats["b23"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.9,21.4,90),"ano":"1895","paises":[havai(cor="#e63946")],"atores":[
     A("icone",(-157.5,21.55),icone="explosao",rotulo="UPRISING",em="supporters"),
     A("retrato",(-158.3,21.55),img="liliuokalani",nome="QUEEN LILIUOKALANI",em="queen"),
     A("carimbo",(-157.9,21.1),texto="ARRESTED",em="arrested")]},
]}
beats["b24"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.86,21.32,110),"paises":[havai(cor="#e63946")],"atores":[
     A("foto",(-158.2,21.45),img="anexacao",rotulo="IOLANI PALACE",em="She"),
     A("preco",(-157.55,21.2),valor=8,prefixo="",sufixo="MONTHS AS A PRISONER",cor="#e63946",em="eight")]},
]}
beats["b25"] = {"cenas": [
  {"tipo":"mapa","para":V(-125,30,2.4),"paises":[havai(cor="#e63946"),{"iso":"USA","bandeira":"USA"}],"rotas":[R([HNL,SF,DC],cor="#ffd400",tracejada=True,em="petitions",dur=60)],"atores":[
     A("preco",(-150,30),valor=21000,prefixo="",sufixo="SIGNATURES",cor="#1fa45b",em="twenty-one"),
     A("icone",(-100,40),icone="documento",rotulo="PETITIONS",em="paper"),
     A("carimbo",(-90,32),texto="TREATY FAILED",em="failed")]},
]}
beats["b26"] = {"cenas": [
  {"tipo":"mapa","para":V(-170,25,1.5),"ano":"1898","paises":[havai(cor="#e63946")],"rotas":[R([SF,HNL,MANILA],icone="navio",pais="USA",cor="#ffffff",em="warships",dur=80)],"atores":[
     A("icone",(-157.8,27),emoji="⚓",rotulo="STEPPING STONE",em="perfect"),
     A("icone",MANILA,icone="explosao",rotulo="PHILIPPINES",em="Philippines")]},
  {"em":"August","tipo":"mapa","para":V(-157.86,21.32,110),"paises":[havai(cor="#2f6fde")],"atores":[
     A("foto",(-158.2,21.45),img="anexacao",rotulo="IOLANI PALACE, AUG. 1898",em="lowered"),
     A("bandeira",(-157.55,21.45),pais="HAW",em="Hawaiian"),
     A("bandeira",(-157.55,21.2),pais="USA",em="American"),
     A("reacao",(-157.55,21.45),emoji="😔",em="refusing")]},
]}
# ---- 7. The Fiftieth State
beats["b27"] = {"cenas": [
  {"tipo":"mapa","para":V(-175,28,1.6),"ano":"1941","paises":[havai(cor="#2f6fde"),{"iso":"JPN","bandeira":"JPN","em":"Japan"}],"rotas":[R([(147,44),(-170,40),(-158,26),PEARL],icone="aviao",cor="#e63946",em="attacked",dur=70)],"atores":[
     A("icone",PEARL,icone="explosao",rotulo="PEARL HARBOR",em="Pearl")]},
]}
beats["b28"] = {"cenas": [
  {"tipo":"mapa","para":V(-157.97,21.36,110),"paises":[havai(cor="#2f6fde")],"atores":[
     A("foto",(-158.3,21.5),img="arizona",rotulo="USS ARIZONA, DEC. 7, 1941",em="More"),
     A("preco",(-157.6,21.2),valor=2403,prefixo="",sufixo="KILLED",cor="#e63946",em="thousand")]},
]}
beats["b29"] = {"cenas": [
  {"tipo":"mapa","para":ILHAS,"ano":"1959","paises":[havai(cor="#2f6fde",em="fiftieth")],"atores":[
     A("preco",(-157.3,22.6),valor=50,prefixo="",sufixo="TH STATE",cor="#012169",em="fiftieth")]},
]}
beats["b30"] = {"cenas": [
  {"tipo":"mapa","para":ILHAS,"paises":[havai(cor="#2f6fde")],"atores":[
     A("preco",(-159.3,21.6),valor=94,prefixo="",sufixo="% YES",cor="#1fa45b",em="ninety"),
     A("icone",(-155.5,21.6),icone="interrogacao",rotulo="INDEPENDENCE?\nNOT ON THE BALLOT",em="Independence")]},
  {"em":"Today","tipo":"mapa","para":V(-170,5,1.2),"paises":[havai(cor="#2f6fde")],"atores":[
     A("icone",HNL,icone="radar",rotulo="INDO-PACIFIC COMMAND",em="Indo-Pacific"),
     A("rotulo",(-170,-20),texto="HALF THE PLANET",cor="#ffd400",em="half")]},
]}
beats["b31"] = {"cenas": [
  {"tipo":"mapa","para":V(-77.04,38.9,20),"ano":"1993","paises":[{"iso":"USA","bandeira":"USA"}],"atores":[
     A("icone",DC,icone="documento",rotulo="APOLOGY RESOLUTION",em="resolution"),
     A("preco",(-74.8,40.0),valor=100,prefixo="",sufixo="YEARS LATER",cor="#ffd400",em="hundredth"),
     A("carimbo",(-77,37.6),texto="APOLOGY",cor="#1fa45b",em="apologized")]},
]}
# ---- 8. The Pattern
beats["b32"] = {"cenas": [
  {"tipo":"mapa","para":V(-110,35,1.3),"paises":[havai(cor="#e63946",em="Hawaii,"),{"iso":"PAN","bandeira":"PAN","em":"Panama"},{"iso":"GRL","bandeira":"GRL","em":"Greenland,"},{"iso":"CAN","bandeira":"CAN","em":"Canada."}],"atores":[
     A("icone",(-157.8,25),emoji="🌺",rotulo="HAWAII",em="Hawaii,"),
     A("icone",(-79.7,9.2),icone="ancora",rotulo="PANAMA",em="Panama"),
     A("icone",(-42,72),emoji="🧊",rotulo="GREENLAND",em="Greenland,"),
     A("icone",(-100,58),emoji="🍁",rotulo="CANADA",em="Canada."),
     A("rotulo",(-115,10),texto="THE STEPPING STONES",cor="#ffd400",em="stepping")]},
]}
beats["b33"] = {"cenas": [
  {"tipo":"mapa","para":ILHAS,"paises":[havai(cor="#e63946")],"atores":[
     A("carimbo",(-157.3,21.8),texto="KINGDOM → STATE",cor="#ffd400",em="kingdom"),
     A("icone",(-157.3,19.3),icone="documento",rotulo="THE APOLOGY",em="apology")]},
]}
beats["b34"] = {"cenas": [
  {"tipo":"mapa","para":ILHAS,"paises":[havai(cor="#e63946")],"rotas":[R([(-150,30),HNL],icone="aviao",cor="#ffffff",em="tourists",dur=50)],"atores":[
     A("preco",(-159.3,21.6),valor=10000000,prefixo="~",sufixo="VISITORS / YEAR",cor="#ffd400",em="ten"),
     A("bandeira",(-155.5,21.4),pais="HAW",em="sovereignty"),
     A("fala",(-155.5,21.4),texto="NEVER GIVEN UP.",em="never")]},
]}
beats["b35"] = {"cenas": [
  {"tipo":"mapa","de":ILHAS,"para":V(-120,25,1.2),"paises":[havai(cor="#e63946"),{"iso":"GRL","bandeira":"GRL","em":"Greenland,"},{"iso":"PAN","bandeira":"PAN","em":"Panama"},{"iso":"CAN","bandeira":"CAN","em":"Canada."}],"atores":[
     A("rotulo",(-90,52),texto="WATCH NEXT",cor="#ffd400",em="watch")]},
  {"em":"subscribe","tipo":"final"},
]}

CHAVES = ["Hawaii","Hawaiian","kingdom","queen","Liliuokalani","Kalakaua","Cook","sugar","Pearl","Marines","Dole","Cleveland","war","petitions","annexed","Japan","apologized","apology","Congress","Boston","Committee","Bayonet","overthrow","Panama","Greenland","Canada"]
sb = {"titulo":"How America Took Hawaii","idioma":"en","estilo":"mapa","trilha":"trilha-mapa","chaves":CHAVES,"beats":beats}
json.dump(sb, open(sys.argv[1],"w"), ensure_ascii=False, indent=1)
print(len(beats),"beats",sum(len(b["cenas"]) for b in beats.values()),"cenas")
