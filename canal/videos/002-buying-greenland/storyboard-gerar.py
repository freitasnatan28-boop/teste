import json, sys
def V(lon, lat, z): return {"centro": [lon, lat], "zoom": z}
US1803 = [(-67,45),(-70,41.6),(-74,40.5),(-75.5,38.5),(-76,35),(-78,33.8),(-81,32),(-81.5,30.7),(-85,31),(-91.5,31),(-91.2,33),(-90,35),(-89.2,36.9),(-90.2,38.8),(-91.4,40.5),(-91.2,43.5),(-92.8,45),(-95.2,47.2),(-95.2,49),(-89.5,48),(-84.5,46.5),(-82.5,45.3),(-82.4,43),(-83,42),(-79,42.8),(-76.5,43.5),(-74.7,45),(-71.5,45),(-70,46.7),(-69,47.4),(-67.8,47)]
LOUIS = [(-89.4,29.0),(-91.2,31.0),(-91.0,33.0),(-90.1,35.0),(-89.2,36.9),(-90.2,38.8),(-91.4,40.5),(-91.2,43.5),(-92.8,45.0),(-93.3,47.0),(-95.2,47.6),(-95.2,49.0),(-104,49),(-113.5,49),(-112.8,46.5),(-110.5,44.5),(-109,43),(-106.5,41.2),(-106,39.5),(-105.5,38),(-100,37.5),(-100,34.5),(-94.5,33.6),(-94.0,32.0),(-93.7,29.7)]
FLORIDA = [(-87.6,31.0),(-85.0,31.0),(-84.9,30.7),(-81.5,30.7),(-81.3,30.0),(-80.0,26.8),(-80.4,25.2),(-81.1,25.1),(-82.0,26.5),(-82.8,27.9),(-83.7,29.9),(-85.4,29.7),(-87.5,30.3)]
MEXC = [(-124.2,42),(-106.0,42),(-106.0,38.5),(-106.6,32.0),(-107.5,32.6),(-109,32.9),(-112,33.0),(-114.7,32.72),(-117.1,32.55),(-117.3,33.2),(-118.5,34.0),(-120.6,34.6),(-121.9,36.6),(-122.5,37.8),(-123.8,39.8),(-124.4,40.4)]
GADS = [(-114.8,32.5),(-111.07,31.33),(-108.21,31.33),(-108.21,31.78),(-106.53,31.78),(-106.6,32.0),(-107.5,32.6),(-109,32.9),(-112,33.0),(-114.7,32.72)]
AK = [-150, 64]
DC = (-77.04, 38.9); PARIS=(2.35,48.85); NOLA=(-90.07,29.95); LONDON=(-0.13,51.5); AMS=(4.9,52.37)
CPH=(12.57,55.68); NUUK=(-51.7,64.18); PIT=(-68.7,76.53); SITKA=(-135.33,57.05); STT=(-64.93,18.34)
def Z(p, **k): return {"pontos": [list(x) for x in p], **k}
def A(tipo, lonlat, **k): return {"tipo": tipo, "lonlat": list(lonlat), **k}

beats = {}
beats["b01"] = {"cenas": [
  {"tipo":"mapa","de":V(-40,30,1.13),"para":V(-77,39,7),"ano":"2019","atores":[
     A("retrato",DC,img="trump",nome="TRUMP",em="President"),
     A("fala",DC,texto="LET'S BUY GREENLAND!",em="wanted")]},
  {"em":"biggest","tipo":"mapa","para":V(-42,68,4.6),"paises":[{"iso":"GRL","bandeira":"GRL","em":"biggest"}],"atores":[
     A("rotulo",(-42,74),texto="BIGGEST ISLAND ON EARTH",em="island")]},
  {"em":"Denmark's","tipo":"mapa","para":V(-22,60,3.3),"paises":[{"iso":"DNK","bandeira":"DNK","em":"Denmark's"},{"iso":"GRL","bandeira":"GRL"}],"atores":[
     A("bandeira",CPH,pais="DNK",em="Denmark's"),
     A("fala",CPH,texto="ABSURD!",em="absurd"),
     A("bandeira",NUUK,pais="GRL",em="Greenland's"),
     A("fala",NUUK,texto="WE ARE NOT FOR SALE.",em="not")]},
]}
beats["b02"] = {"cenas": [
  {"tipo":"mapa","para":V(-58,58,3.3),"ano":"2025","paises":[{"iso":"GRL","bandeira":"GRL"},{"iso":"USA","bandeira":"USA","em":"he"}],"atores":[
     A("retrato",DC,img="trump",nome="TRUMP",em="he"),
     A("fala",DC,texto="I'M SERIOUS.",em="again"),
     A("bandeira",NUUK,pais="GRL",em="this"),
     A("reacao",NUUK,emoji="😳",em="nobody")]},
]}
beats["b03"] = {"cenas": [
  {"tipo":"mapa","para":V(-112,48,2.6),"zonas":[
     Z(LOUIS,cor="#ffd400",em="Buying"),Z(FLORIDA,cor="#ffd400",em="how"),Z(MEXC,cor="#ffd400",em="America"),Z(GADS,cor="#ffd400",em="built")],
   "paises":[{"iso":"USA","cor":"#ffd400","perto":AK,"em":"Close"}],"atores":[
     A("rotulo",(-100,24),texto="BOUGHT, NOT CONQUERED",em="Buying")]},
  {"em":"forty","tipo":"contador","ate":40,"unidade":"%","prefixo":"~","sub":"of the United States was bought"},
  {"em":"cash","tipo":"mapa","para":V(-96,38,5.2),"zonas":[Z(LOUIS,cor="#ffd400"),Z(MEXC,cor="#ffd400"),Z(FLORIDA,cor="#ffd400")],"atores":[
     A("icone",(-104,42),icone="dinheiro",rotulo="CASH",em="cash"),
     A("icone",(-86,35),icone="ouro",rotulo="GOLD",em="gold"),
     A("reacao",(-86,35),emoji="🤯",em="lopsided")]},
]}
beats["b04"] = {"cenas": [
  {"tipo":"mapa","para":V(-62,52,2.5),"titulo":"WHY AMERICA KEEPS\nTRYING TO BUY GREENLAND","som":"impacto","paises":[{"iso":"GRL","bandeira":"GRL"},{"iso":"USA","bandeira":"USA"}]},
  {"em":"every","tipo":"linhaTempo","itens":[{"data":"1803","texto":"Louisiana"},{"data":"1819","texto":"Florida"},{"data":"1848","texto":"Mexico"},{"data":"1853","texto":"Gadsden"},{"data":"1867","texto":"Alaska"},{"data":"1917","texto":"Virgin Islands"},{"data":"1946","texto":"Greenland?"}]},
]}
# ---- 2. Deal of the century
beats["b05"] = {"cenas": [
  {"tipo":"mapa","de":V(-60,40,2.5),"para":V(-84,38,4.6),"ano":"1803","zonas":[Z(US1803,bandeira="USA",em="United")],"rotas":[
     {"pontos":[[-93.3,45],[-91,41],[-90.2,38.6],[-89.2,36.9],[-90.1,35],[-91.1,32.3],[-90.07,29.95]],"cor":"#4cc9f0","inicio":0.25,"fim":0.5}],"atores":[
     A("rotulo",(-96,36),texto="MISSISSIPPI",cor="#4cc9f0",em="Mississippi")]},
  {"em":"New","tipo":"mapa","para":V(-87,34,9),"zonas":[Z(US1803,bandeira="USA")],"rotas":[
     {"pontos":[[-84.5,38.5],[-86,37.9],[-88.5,37.1],[-89.2,36.9],[-90.1,35],[-91.1,32.3],[-90.07,29.95]],"icone":"navio","cor":"#ffffff","inicio":0.45,"fim":0.95}],"atores":[
     A("icone",NOLA,icone="ancora",rotulo="NEW ORLEANS",em="New"),
     A("rotulo",(-84.5,39.6),texto="KENTUCKY & OHIO FARMS",em="Farmers")]},
]}
beats["b06"] = {"cenas": [
  {"tipo":"mapa","para":V(-97,40,4.4),"zonas":[Z(US1803,bandeira="USA"),Z(LOUIS,bandeira="FRA",em="huge")],"atores":[
     A("icone",NOLA,icone="ancora"),
     A("bandeira",(-100,40),pais="FRA",em="France"),
     A("retrato",(-102,44),img="napoleao",nome="NAPOLEON",em="Napoleon")]},
]}
beats["b07"] = {"cenas": [
  {"tipo":"mapa","para":V(-38,40,2.8),"rotas":[{"pontos":[list(DC),[-40,44],list(PARIS)],"icone":"navio","pais":"USA","cor":"#ffffff","inicio":0.3,"fim":0.75,"tracejada":True}],"atores":[
     A("retrato",DC,img="jefferson",nome="JEFFERSON",em="Thomas"),
     A("bandeira",PARIS,pais="FRA",em="Paris"),
     A("fala",DC,texto="BUY NEW ORLEANS.",em="mission")]},
  {"em":"authorized","tipo":"mapa","para":V(-89,31,11),"zonas":[Z(LOUIS,bandeira="FRA")],"atores":[
     A("icone",NOLA,icone="ancora",rotulo="NEW ORLEANS"),
     A("preco",(-85.5,33.5),valor=10000000,rotulo="MAX BUDGET",em="ten")]},
]}
beats["b08"] = {"cenas": [
  {"tipo":"mapa","para":V(-72.5,19,12),"atores":[
     A("unidade",(-74.5,19.6),pais="FRA",em="army"),
     A("icone",(-72.3,18.7),icone="explosao",rotulo="HAITIAN REVOLUTION",em="crushed"),
     A("rotulo",(-71,20.4),texto="HAITI",em="Haiti")]},
  {"em":"Without","tipo":"mapa","para":V(-8,47,6),"paises":[{"iso":"FRA","bandeira":"FRA"},{"iso":"GBR","bandeira":"GBR","em":"Britain"}],"atores":[
     A("retrato",(4,45.5),img="napoleao",nome="NAPOLEON",em="Without"),
     A("icone",(-6,55.5),icone="alerta",rotulo="WAR WITH BRITAIN",em="war"),
     A("fala",(4,45.5),texto="I NEED MONEY. FAST.",em="needed")]},
]}
beats["b09"] = {"cenas": [
  {"tipo":"mapa","para":V(-92,40,4.3),"zonas":[Z(US1803,bandeira="USA"),Z(LOUIS,bandeira="FRA",em="All")],"atores":[
     A("icone",NOLA,icone="ancora",rotulo="THE CITY",em="city"),
     A("retrato",(-77,40),img="jefferson",nome="JEFFERSON",em="Americans"),
     A("reacao",(-77,40),emoji="😮",em="never"),
     A("rotulo",(-102,42),texto="ALL OF LOUISIANA",em="All")]},
]}
beats["b10"] = {"cenas": [
  {"tipo":"mapa","para":V(-96,40,4.4),"zonas":[Z(US1803,bandeira="USA"),Z(LOUIS,bandeira="USA",em="price")],"atores":[
     A("preco",(-101,44),valor=15000000,em="fifteen"),
     A("rotulo",(-101,38.5),texto="828,000 SQ MILES",em="eight"),
     A("rotulo",(-101,35.5),texto="≈ 3 CENTS AN ACRE",cor="#ffd400",em="Roughly")]},
  {"em":"doubled","tipo":"contador","ate":2,"prefixo":"×","unidade":"","sub":"the size of the US, overnight"},
  {"em":"Today","tipo":"mapa","para":V(-96,40,4.6),"paises":[{"iso":"USA","bandeira":"USA"}],"zonas":[Z(LOUIS,cor="#ffd400",em="Today")],"atores":[
     A("rotulo",(-101,41),texto="15 STATES TODAY",em="fifteen")]},
]}
beats["b11"] = {"cenas": [
  {"tipo":"mapa","para":V(1,50.5,10),"paises":[{"iso":"GBR","bandeira":"GBR","em":"British"},{"iso":"FRA","bandeira":"FRA"}],"rotas":[
     {"pontos":[list(LONDON),list(PARIS)],"icone":"dinheiro","cor":"#1fa45b","inicio":0.35,"fim":0.6},
     {"pontos":[list(AMS),list(PARIS)],"icone":"dinheiro","cor":"#1fa45b","inicio":0.4,"fim":0.65}],"atores":[
     A("rotulo",(4.9,53.3),texto="AMSTERDAM",em="Dutch"),
     A("retrato",(2.35,47.6),img="napoleao",nome="NAPOLEON",em="Napoleon"),
     A("reacao",(2.35,47.6),emoji="😏",em="back")]},
]}
# ---- 3. Florida, Mexico, desert
beats["b12"] = {"cenas": [
  {"tipo":"mapa","de":V(-90,35,4),"para":V(-84,29,9),"ano":"1819","zonas":[Z(FLORIDA,bandeira="ESP",em="Spain"),Z(FLORIDA,bandeira="USA",em="handed")],"atores":[
     A("bandeira",(-81.6,28.2),pais="ESP",em="Spain"),
     A("reacao",(-81.6,28.2),emoji="😩",em="barely"),
     A("preco",(-88.5,26.8),valor=0,rotulo="PAID TO SPAIN",em="single"),
     A("preco",(-77.5,31.5),valor=5000000,rotulo="IN CLAIMS",em="five")]},
]}
beats["b13"] = {"cenas": [
  {"tipo":"mapa","para":V(-106,30,5),"ano":"1846","paises":[{"iso":"MEX","bandeira":"MEX","em":"Mexico"}],"zonas":[Z(MEXC,bandeira="MEX",em="Mexico")],"atores":[
     A("unidade",(-97,31),pais="USA",para=[-103,26],em="war",mover="war"),
     A("unidade",(-100,23),pais="MEX",em="Mexico")]},
  {"em":"gave","tipo":"mapa","para":V(-112,34,6),"zonas":[Z(MEXC,bandeira="USA",em="gave")],"atores":[
     A("rotulo",(-119.6,37.2),texto="CALIFORNIA",em="California"),
     A("rotulo",(-116.8,39.6),texto="NEVADA",em="Nevada"),
     A("rotulo",(-111.6,39.5),texto="UTAH",em="Utah"),
     A("rotulo",(-111.7,34.4),texto="ARIZONA",em="Arizona"),
     A("preco",(-102,37.5),valor=15000000,em="fifteen")]},
]}
beats["b14"] = {"cenas": [
  {"tipo":"texto","linhas":["PURCHASE?","OR CONQUEST?"],"som":"hit"},
  {"em":"Nine","tipo":"mapa","para":V(-120.5,38.3,16),"zonas":[Z(MEXC,bandeira="USA")],"atores":[
     A("rotulo",(-120.5,41.2),texto="9 DAYS BEFORE THE TREATY",em="Nine"),
     A("icone",(-120.89,38.8),icone="ouro",rotulo="GOLD!",em="gold"),
     A("reacao",(-120.89,38.8),emoji="🤑",em="Within")]},
]}
beats["b15"] = {"cenas": [
  {"tipo":"mapa","para":V(-106,33,6),"ano":"1853","zonas":[Z(MEXC,bandeira="USA"),Z(GADS,cor="#ffd400",em="strip")],"rotas":[
     {"pontos":[[-94,32.5],[-97,32.7],[-106.5,31.8],[-110.9,32.2],[-114.6,32.7],[-118.2,34.05]],"cor":"#ffffff","tracejada":True,"inicio":0.4,"fim":0.75}],"atores":[
     A("preco",(-104,37),valor=10000000,em="Ten"),
     A("rotulo",(-110,29.3),texto="RAILROAD TO THE PACIFIC",em="railroad")]},
  {"em":"strangest","tipo":"mapa","para":V(-140,58,3),"som":"riser","atores":[
     A("icone",AK,icone="interrogacao",em="frozen")]},
]}
# ---- 4. Seward's icebox
beats["b16"] = {"cenas": [
  {"tipo":"mapa","para":V(-146,62,5.5),"paises":[{"iso":"USA","bandeira":"RUS","perto":AK,"em":"Alaska"}],"atores":[
     A("retrato",(-150,64),img="alexandre",nome="TSAR ALEXANDER II",em="Russian")]},
  {"em":"lost","tipo":"mapa","para":V(25,50,4.5),"paises":[{"iso":"RUS","bandeira":"RUS"},{"iso":"GBR","bandeira":"GBR","em":"Britain"},{"iso":"FRA","bandeira":"FRA","em":"France"}],"atores":[
     A("icone",(34,45),icone="explosao",rotulo="CRIMEAN WAR",em="Crimean")]},
  {"em":"treasury","tipo":"mapa","para":V(-146,62,5.5),"paises":[{"iso":"USA","bandeira":"RUS","perto":AK}],"atores":[
     A("retrato",(-150,64),img="alexandre",nome="TSAR ALEXANDER II",em="treasury"),
     A("reacao",(-150,64),emoji="😰",em="impossible")]},
]}
beats["b17"] = {"cenas": [
  {"tipo":"mapa","para":V(-128,60,4),"paises":[{"iso":"USA","bandeira":"RUS","perto":AK},{"iso":"CAN","bandeira":"GBR","em":"British"}],"atores":[
     A("unidade",(-118,57),pais="GBR",para=[-146,62],em="war",mover="take"),
     A("retrato",(-155,65),img="alexandre",nome="TSAR ALEXANDER II",em="Tsar"),
     A("fala",(-155,65),texto="BETTER SELL IT TO AMERICA.",em="better")]},
]}
beats["b18"] = {"cenas": [
  {"tipo":"mapa","para":V(-144,61,5),"ano":"1867","paises":[{"iso":"USA","bandeira":"RUS","perto":AK},{"iso":"USA","bandeira":"USA","perto":AK,"em":"deal"}],"atores":[
     A("retrato",(-122,57),img="seward",nome="SEWARD",em="William"),
     A("preco",(-150,56.5),valor=7200000,em="Seven"),
     A("rotulo",(-152,68.5),texto="≈ 2 CENTS AN ACRE",cor="#ffd400",em="two"),
     A("rotulo",(-152,66),texto="2× THE SIZE OF TEXAS",em="twice")]},
  {"em":"canceled","tipo":"texto","linhas":["THE $7.2 MILLION CHECK","IS STILL IN THE NATIONAL ARCHIVES"]},
]}
beats["b19"] = {"cenas": [
  {"tipo":"mapa","para":V(-74,40,6.5),"paises":[{"iso":"USA","bandeira":"USA"}],"atores":[
     A("bandeira",(-71,42.4),pais="USA",em="Critics"),
     A("fala",(-71,42.4),texto="SEWARD'S FOLLY!",em="Folly"),
     A("bandeira",(-77.04,38.9),pais="USA",em="Icebox"),
     A("fala",(-77.04,38.9),texto="SEWARD'S ICEBOX!",em="Icebox"),
     A("reacao",(-77.04,38.9),emoji="🥶",em="frozen")]},
]}
beats["b20"] = {"cenas": [
  {"tipo":"foto","img":"chilkoot","rotulo":"Klondike gold rush, 1897","pb":True,"som":"moedas"},
  {"em":"1968","tipo":"mapa","para":V(-150,66,6),"ano":"1968","paises":[{"iso":"USA","bandeira":"USA","perto":AK}],"atores":[
     A("icone",(-148.4,70.3),icone="petroleo",rotulo="PRUDHOE BAY",em="oil"),
     A("rotulo",(-148,63),texto="LARGEST OIL FIELD IN NORTH AMERICA",em="largest")]},
  {"em":"Cold","tipo":"mapa","para":V(-162,65,10),"paises":[{"iso":"USA","bandeira":"USA","perto":AK},{"iso":"RUS","bandeira":"URS","perto":[-173,66],"em":"Soviet"}],"atores":[
     A("unidade",(-160,64.6),pais="USA",em="front"),
     A("unidade",(-175,66),pais="URS",em="Soviet"),
     A("rotulo",(-168.8,63.6),texto="BERING STRAIT",em="Bering"),
     A("reacao",(-160,64.6),emoji="😎",em="Nobody")]},
]}
# ---- 5. Islands for gold
beats["b21"] = {"cenas": [
  {"tipo":"mapa","de":V(-60,40,2.5),"para":V(-72,15,7),"ano":"1917","paises":[{"iso":"VIR","bandeira":"DNK"}],"rotas":[
     {"pontos":[[-55,26],[-64.5,18.8],[-75,13],[-79.9,9.35]],"icone":"navio","cor":"#ffffff","inicio":0.6,"fim":0.95,"tracejada":True}],"atores":[
     A("bandeira",STT,pais="DNK",em="Denmark"),
     A("icone",(-58,21),icone="alerta",rotulo="GERMANY?",em="Germany"),
     A("icone",(-79.7,9.1),icone="ancora",rotulo="PANAMA CANAL",em="Panama")]},
]}
beats["b22"] = {"cenas": [
  {"tipo":"mapa","para":V(-64.85,18.1,32),"paises":[{"iso":"VIR","bandeira":"DNK"},{"iso":"VIR","bandeira":"USA","em":"Today"}],"atores":[
     A("preco",(-64.85,18.75),valor=25000000,rotulo="IN GOLD",em="twenty-five"),
     A("rotulo",(-64.85,17.55),texto="US VIRGIN ISLANDS",em="Virgin")]},
  {"em":"knocked","tipo":"mapa","para":V(-25,58,3.3),"som":"riser","paises":[{"iso":"GRL","bandeira":"DNK"},{"iso":"DNK","bandeira":"DNK"}],"atores":[
     A("bandeira",CPH,pais="DNK",em="knocked"),
     A("reacao",CPH,emoji="😅",em="door")]},
]}
# ---- 6. Secret offer
beats["b23"] = {"cenas": [
  {"tipo":"mapa","para":V(-55,60,3.4),"ano":"1946","paises":[{"iso":"GRL","bandeira":"DNK"},{"iso":"USA","bandeira":"USA"}],"atores":[
     A("retrato",DC,img="truman",nome="TRUMAN",em="Truman"),
     A("carimbo",(-28,52),texto="SECRET",em="secret"),
     A("preco",(-42,72),valor=100000000,rotulo="IN GOLD",em="hundred")]},
]}
beats["b24"] = {"cenas": [
  {"tipo":"mapa","para":V(-25,58,3.3),"paises":[{"iso":"GRL","bandeira":"DNK"},{"iso":"DNK","bandeira":"DNK"}],"atores":[
     A("bandeira",CPH,pais="DNK",em="Denmark"),
     A("fala",CPH,texto="NO.",em="no"),
     A("carimbo",(-35,55),texto="TOP SECRET",em="hidden",ate="declassified"),
     A("carimbo",(-35,55),texto="DECLASSIFIED 1991",cor="#2a9d8f",em="declassified")]},
]}
beats["b25"] = {"cenas": [
  {"tipo":"mapa","para":V(-62,73,6.5),"paises":[{"iso":"GRL","bandeira":"GRL"}],"rotas":[
     {"pontos":[[30,80],[-105,40]],"cor":"#e63946","tracejada":True,"inicio":0.72,"fim":1}],"atores":[
     A("icone",PIT,icone="radar",rotulo="PITUFFIK SPACE BASE",em="air"),
     A("rotulo",(-50,80.8),texto="NORTH POLE ↑",em="North")]},
]}
# ---- 7. Why now
beats["b26"] = {"cenas": [
  {"tipo":"mapa","para":V(-25,48,2.6),"paises":[{"iso":"RUS","bandeira":"RUS","em":"Russia"},{"iso":"USA","bandeira":"USA","em":"United"},{"iso":"GRL","cor":"#ffd400","em":"Greenland"}],"rotas":[
     {"pontos":[[37.6,55.75],[-77.04,38.9]],"cor":"#ffd400","inicio":0.5,"fim":0.9}]},
]}
beats["b27"] = {"cenas": [
  {"tipo":"mapa","para":V(-92,50,2.7),"som":"gelo","paises":[{"iso":"GRL","bandeira":"GRL"}],"rotas":[
     {"pontos":[[-10,55],[-45,58],[-58,68],[-72,74.5],[-88,74.3],[-105,73],[-125,71],[-140,70.5],[-158,71.3]],"icone":"navio","cor":"#4cc9f0","inicio":0.3,"fim":0.95,"tracejada":True}],"atores":[
     A("rotulo",(-100,66),texto="NEW ARCTIC ROUTES",cor="#4cc9f0",em="routes")]},
]}
beats["b28"] = {"cenas": [
  {"tipo":"mapa","para":V(-45,62,8),"paises":[{"iso":"GRL","bandeira":"GRL"}],"atores":[
     A("icone",(-46,60.9),icone="minerio",rotulo="RARE EARTHS",em="deposits")]},
  {"em":"phone","tipo":"lista","titulo":"RARE EARTHS ARE INSIDE","itens":[{"texto":"Your phone","em":"phone"},{"texto":"Electric cars","em":"electric"},{"texto":"Fighter jets","em":"fighter"}]},
  {"em":"China","tipo":"contador","ate":90,"unidade":"%","sub":"processed in China"},
  {"em":"break","tipo":"mapa","para":V(-42,66,5),"paises":[{"iso":"GRL","bandeira":"GRL"}],"atores":[
     A("icone",NUUK,icone="aviao",rotulo="NEW AIRPORTS",em="airports"),
     A("bandeira",(-33,70),pais="CHN",em="Chinese"),
     A("fala",(-33,70),texto="WE'LL BUILD THEM!",em="bid"),
     A("bandeira",(-25,63.5),pais="DNK",em="Denmark"),
     A("fala",(-25,63.5),texto="WE'LL PAY OURSELVES.",em="stepped")]},
]}
beats["b29"] = {"cenas": [
  {"tipo":"mapa","para":V(-25,58,3.3),"paises":[{"iso":"GRL","bandeira":"GRL"},{"iso":"DNK","bandeira":"DNK"}],"rotas":[
     {"pontos":[list(CPH),list(NUUK)],"icone":"dinheiro","cor":"#1fa45b","inicio":0.55,"fim":0.9}],"atores":[
     A("rotulo",(-42,74),texto="56,000 PEOPLE",em="fifty-six"),
     A("bandeira",CPH,pais="DNK",em="Denmark")]},
]}
# ---- 8. Pattern
beats["b30"] = {"cenas": [
  {"tipo":"mapa","para":V(-110,40,2.4),"zonas":[Z(LOUIS,cor="#ffd400"),Z(FLORIDA,cor="#ffd400"),Z(MEXC,cor="#ffd400")],"paises":[{"iso":"USA","cor":"#ffd400","perto":AK},{"iso":"VIR","cor":"#ffd400"}],"atores":[
     A("bandeira",(-99,42),pais="FRA",em="Napoleon"),
     A("reacao",(-99,42),emoji="💸",em="cash"),
     A("bandeira",(-81.6,28.3),pais="ESP",em="Spain"),
     A("reacao",(-81.6,28.3),emoji="😩",em="hold"),
     A("bandeira",(-116,37),pais="MEX",em="Mexico"),
     A("reacao",(-116,37),emoji="🏳️",em="lost"),
     A("bandeira",(-152,64),pais="RUS",em="Russia"),
     A("reacao",(-152,64),emoji="😨",em="afraid"),
     A("bandeira",STT,pais="DNK",em="Denmark"),
     A("reacao",STT,emoji="😰",em="Germany")]},
  {"em":"Every","tipo":"texto","linhas":["EVERY TIME,","THE SELLER WAS IN TROUBLE"],"som":"hit"},
]}
beats["b31"] = {"cenas": [
  {"tipo":"mapa","para":V(-25,60,3.3),"paises":[{"iso":"GRL","bandeira":"GRL","em":"Greenland"},{"iso":"DNK","bandeira":"DNK"}],"atores":[
     A("bandeira",CPH,pais="DNK",em="Denmark"),
     A("reacao",CPH,emoji="😌",em="desperate"),
     A("bandeira",NUUK,pais="GRL",em="people"),
     A("fala",NUUK,texto="OUR LAND. OUR CHOICE.",em="voice"),
     A("fala",NUUK,texto="INDEPENDENCE IS OUR RIGHT.",em="right")]},
]}
beats["b32"] = {"cenas": [
  {"tipo":"mapa","para":V(-40,20,1.13),"zonas":[Z(LOUIS,cor="#ffd400"),Z(FLORIDA,cor="#ffd400"),Z(MEXC,cor="#ffd400"),Z(GADS,cor="#ffd400")],"paises":[{"iso":"USA","cor":"#ffd400","perto":AK},{"iso":"GRL","bandeira":"GRL"}],"atores":[
     A("icone",(-42,72),icone="interrogacao",rotulo="NOT FOR SALE?",em="belong")]},
  {"em":"subscribe","tipo":"final"},
]}
sb = {"titulo":"Why America Keeps Trying to Buy Greenland","idioma":"en","estilo":"mapa","trilha":"trilha-mapa","beats":beats}
json.dump(sb, open(sys.argv[1],"w"), ensure_ascii=False, indent=1)
print(len(beats), "beats", sum(len(b["cenas"]) for b in beats.values()), "cenas")
