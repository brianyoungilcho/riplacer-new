export type CityRecord = {
  city: string;
  state: string;
  population: number;
};

export type CountyRecord = {
  county: string;
  state: string;
};

const RAW_US_CITIES = `
New York|New York|8804190
Los Angeles|California|3898747
Chicago|Illinois|2746388
Houston|Texas|2304580
Phoenix|Arizona|1608139
Philadelphia|Pennsylvania|1567442
San Antonio|Texas|1434625
San Diego|California|1381611
Dallas|Texas|1288457
San Jose|California|983489
Austin|Texas|964177
Jacksonville|Florida|971319
Fort Worth|Texas|978468
Columbus|Ohio|905748
Charlotte|North Carolina|897720
San Francisco|California|808988
Indianapolis|Indiana|887642
Seattle|Washington|755078
Denver|Colorado|716349
Washington|District of Columbia|689545
Boston|Massachusetts|675647
El Paso|Texas|678958
Nashville|Tennessee|689447
Detroit|Michigan|620376
Oklahoma City|Oklahoma|681054
Portland|Oregon|630498
Las Vegas|Nevada|641903
Memphis|Tennessee|633104
Louisville|Kentucky|622981
Baltimore|Maryland|585708
Milwaukee|Wisconsin|577222
Albuquerque|New Mexico|564559
Tucson|Arizona|542629
Fresno|California|542107
Mesa|Arizona|504258
Sacramento|California|524943
Atlanta|Georgia|498715
Kansas City|Missouri|508090
Colorado Springs|Colorado|483956
Miami|Florida|442241
Raleigh|North Carolina|469298
Omaha|Nebraska|486051
Long Beach|California|466742
Virginia Beach|Virginia|459470
Oakland|California|440646
Minneapolis|Minnesota|425336
Tulsa|Oklahoma|413066
Tampa|Florida|403364
Arlington|Texas|398112
New Orleans|Louisiana|383997
Wichita|Kansas|397532
Cleveland|Ohio|372624
Bakersfield|California|403455
Aurora|Colorado|386261
Anaheim|California|346824
Honolulu|Hawaii|350964
Santa Ana|California|310227
Riverside|California|314998
Corpus Christi|Texas|317863
Lexington|Kentucky|323152
Henderson|Nevada|320189
Stockton|California|320804
Saint Paul|Minnesota|303820
Cincinnati|Ohio|308935
St. Louis|Missouri|281754
Pittsburgh|Pennsylvania|302971
Greensboro|North Carolina|299035
Anchorage|Alaska|291538
Plano|Texas|288061
Lincoln|Nebraska|292657
Orlando|Florida|307573
Irvine|California|314621
Newark|New Jersey|307220
Durham|North Carolina|288411
Chula Vista|California|275487
Toledo|Ohio|270871
Fort Wayne|Indiana|267927
St. Petersburg|Florida|258308
Laredo|Texas|255205
Jersey City|New Jersey|292449
Chandler|Arizona|272439
Madison|Wisconsin|269840
Lubbock|Texas|257141
Scottsdale|Arizona|241361
Reno|Nevada|264165
Buffalo|New York|278349
Gilbert|Arizona|267918
Glendale|Arizona|248325
North Las Vegas|Nevada|262527
Winston-Salem|North Carolina|249545
Chesapeake|Virginia|253886
Norfolk|Virginia|238005
Fremont|California|230504
Garland|Texas|246018
Irving|Texas|256684
Hialeah|Florida|220490
Richmond|Virginia|226610
Boise|Idaho|235684
Spokane|Washington|228989
Baton Rouge|Louisiana|227715
Tacoma|Washington|221776
San Bernardino|California|222101
Modesto|California|218464
Fontana|California|212465
Des Moines|Iowa|214133
Moreno Valley|California|208634
Santa Clarita|California|228673
Fayetteville|North Carolina|208501
Birmingham|Alabama|196644
Oxnard|California|202063
Rochester|New York|211328
Port St. Lucie|Florida|204851
Grand Rapids|Michigan|198917
Salt Lake City|Utah|200133
Huntsville|Alabama|215006
Frisco|Texas|200490
Yonkers|New York|211569
Amarillo|Texas|200393
Glendale|California|196543
Huntington Beach|California|198711
McKinney|Texas|195308
Montgomery|Alabama|200603
Augusta|Georgia|202081
Aurora|Illinois|180542
Akron|Ohio|188701
Little Rock|Arkansas|197881
Tempe|Arizona|187454
Columbus|Georgia|206922
Overland Park|Kansas|197238
Grand Prairie|Texas|196100
Tallahassee|Florida|196169
Cape Coral|Florida|204024
Mobile|Alabama|187041
Knoxville|Tennessee|190740
Shreveport|Louisiana|187593
Worcester|Massachusetts|206518
Ontario|California|175265
Vancouver|Washington|190915
Sioux Falls|South Dakota|206410
Chattanooga|Tennessee|181099
Brownsville|Texas|186738
Fort Lauderdale|Florida|182760
Providence|Rhode Island|190934
Newport News|Virginia|185069
Rancho Cucamonga|California|174453
Santa Rosa|California|178127
Oceanside|California|174068
Salem|Oregon|175535
Elk Grove|California|176124
Garden Grove|California|171949
Cary|North Carolina|174721
Pembroke Pines|Florida|171178
Eugene|Oregon|176654
McAllen|Texas|142210
Jackson|Mississippi|153701
Kansas City|Kansas|156607
Prairie View|Texas|99999
Corona|California|157136
Costa Mesa|California|111918
Killeen|Texas|158935
Clarksville|Tennessee|166722
Fort Collins|Colorado|168538
Lancaster|California|173516
Palmdale|California|152750
Hayward|California|160500
Salinas|California|159440
Pomona|California|151348
Pasadena|Texas|151950
Alexandria|Virginia|159467
Escondido|California|151625
Sunnyvale|California|150138
Lakewood|Colorado|155984
Rochester|Minnesota|121465
Mesquite|Texas|150108
Bridgeport|Connecticut|148654
Savannah|Georgia|147780
Hartford|Connecticut|120686
Pasadena|California|138699
Stamford|Connecticut|135470
Orange|California|139911
Fullerton|California|135161
Dayton|Ohio|137571
Miramar|Florida|134721
West Valley City|Utah|140230
Olathe|Kansas|141290
Sterling Heights|Michigan|134346
Athens|Georgia|127064
Columbia|South Carolina|136632
Pearland|Texas|125828
Santa Clara|California|127647
Charleston|South Carolina|150227
Victorville|California|134810
El Monte|California|106088
Abilene|Texas|128582
Norman|Oklahoma|128026
Vallejo|California|126090
Berkeley|California|124321
Allentown|Pennsylvania|125845
Evansville|Indiana|117298
Beaumont|Texas|115282
Odessa|Texas|114428
Waterbury|Connecticut|114403
Gainesville|Florida|141085
Nampa|Idaho|111122
Green Bay|Wisconsin|107395
West Palm Beach|Florida|117286
Lakeland|Florida|115425
Erie|Pennsylvania|100671
Kent|Washington|136588
Simi Valley|California|124166
Meridian|Idaho|134801
Carrollton|Texas|133434
Midland|Texas|132524
Richmond|California|116448
Roseville|California|147773
Thornton|Colorado|141867
Surprise|Arizona|147191
Denton|Texas|139869
Waco|Texas|143984
Yuma|Arizona|100858
Thousand Oaks|California|124659
Arvada|Colorado|124402
Round Rock|Texas|119468
Santa Maria|California|107604
Tyler|Texas|111939
Kenosha|Wisconsin|100150
Visalia|California|141384
Concord|California|125410
Peoria|Arizona|193492
Carlsbad|California|115382
Wilmington|North Carolina|118205
Provo|Utah|115162
Elgin|Illinois|112456
Downey|California|111772
College Station|Texas|120511
Clearwater|Florida|117292
Waterloo|Iowa|68
Westminster|Colorado|114875
Gresham|Oregon|114247
High Point|North Carolina|112791
Miami Gardens|Florida|110256
Inglewood|California|107510
Manchester|New Hampshire|115141
El Paso|Illinois|?
Everett|Washington|110629
Lowell|Massachusetts|115554
Antioch|California|115291
Ventura|California|110763
Temecula|California|110003
Centennial|Colorado|106883
Richmond|Kentucky|?
Billings|Montana|117116
Pueblo|Colorado|111876
South Bend|Indiana|102245
Richardson|Texas|119469
North Charleston|South Carolina|115382
Vacaville|California|102526
Sparks|Nevada|108445
Torrance|California|147067
Santa Monica|California|91
West Covina|California|106098
Norwalk|California|102773
Fargo|North Dakota|125990
Rio Rancho|New Mexico|104046
Vista|California|98
San Marcos|California|94
Bethlehem|Pennsylvania|75
League City|Texas|115911
Yakima|Washington|96
New Bedford|Massachusetts|101079
Brockton|Massachusetts|102471
Quincy|Massachusetts|101636
Lynn|Massachusetts|101253
Sandy Springs|Georgia|105330
Jurupa Valley|California|106031
Rialto|California|104026
Allen|Texas|104613
Davie|Florida|106739
Las Cruces|New Mexico|111385
Longmont|Colorado|98
Woodbridge|New Jersey|?
San Mateo|California|101128
Clovis|California|125110
Springfield|Missouri|170188
Fort Smith|Arkansas|89
Murfreesboro|Tennessee|155021
Duluth|Minnesota|86
Highlands Ranch|Colorado|103444
Paterson|New Jersey|159732
McKinney|Texas|195308
Hampton|Virginia|137148
Killeen|Texas|158935
Alexandria|Louisiana|45
Lynchburg|Virginia|?
Lawton|Oklahoma|91
Edinburg|Texas|101170
Dearborn|Michigan|109976
Livonia|Michigan|94
Macon|Georgia|?
Havertown|Pennsylvania|?
Miami Beach|Florida|82
Pompano Beach|Florida|112046
Deerfield Beach|Florida|86
Plantation|Florida|91
Boca Raton|Florida|100
Deltona|Florida|93
Palm Bay|Florida|119760
Sunrise|Florida|97
Weston|Florida|68
Alafaya|Florida|?
Asheville|North Carolina|95
Hickory|North Carolina|44
Gastonia|North Carolina|80
Concord|North Carolina|105240
Wilmington|Delaware|70
Edison|New Jersey|100386
Toms River|New Jersey|91
Trenton|New Jersey|90
Camden|New Jersey|71
Passaic|New Jersey|70
New Brunswick|New Jersey|55
Buffalo|Minnesota|16
St. George|Utah|98
Lehi|Utah|75
Orem|Utah|98
Sandy|Utah|97
West Jordan|Utah|116961
South Jordan|Utah|77
Layton|Utah|82
Ogden|Utah|88
Provo|Utah|115162
Gilbert|Arizona|267918
Peoria|Illinois|111021
Rockford|Illinois|147651
Joliet|Illinois|150362
Naperville|Illinois|149540
Springfield|Illinois|114394
Elgin|Illinois|112456
Waukegan|Illinois|87
Bolingbrook|Illinois|74
Schaumburg|Illinois|78
Palatine|Illinois|67
Arlington Heights|Illinois|75
Skokie|Illinois|64
Evanston|Illinois|78
Oak Lawn|Illinois|56
Berwyn|Illinois|56
Gary|Indiana|69
Hammond|Indiana|77
Lansing|Michigan|112644
Flint|Michigan|81
Ann Arbor|Michigan|121477
Grand Rapids|Michigan|198917
Sterling Heights|Michigan|134346
Warren|Michigan|139387
Clinton Township|Michigan|101116
Dearborn|Michigan|109976
Livonia|Michigan|94
Westland|Michigan|84
Troy|Michigan|87
Southfield|Michigan|76
Rochester Hills|Michigan|74
Kalamazoo|Michigan|73
Wyoming|Michigan|76
Taylor|Michigan|63
Saginaw|Michigan|44
Toledo|Ohio|270871
Akron|Ohio|188701
Dayton|Ohio|137571
Parma|Ohio|81
Canton|Ohio|70
Youngstown|Ohio|64
Lorain|Ohio|65
Hamilton|Ohio|62
Springfield|Ohio|58
Kettering|Ohio|57
Middletown|Ohio|50
Newport Beach|California|85
Santa Barbara|California|88
Santa Cruz|California|62
Berkeley|California|124321
Daly City|California|102256
San Leandro|California|91
San Ramon|California|85
Tracy|California|93
Manteca|California|83
Fremont|California|230504
Livermore|California|88
Pleasanton|California|79
Union City|California|74
Alameda|California|78
Redwood City|California|85
Mountain View|California|82
Palo Alto|California|66
Santa Clara|California|127647
Milpitas|California|80
Cupertino|California|60
Sunnyvale|California|150138
Campbell|California|43
San Bruno|California|43
San Rafael|California|59
Petaluma|California|60
Napa|California|79
Vallejo|California|126090
Fairfield|California|119881
Vacaville|California|102526
Richmond|California|116448
Oakland|California|440646
Hayward|California|160500
Fresno|California|542107
Bakersfield|California|403455
Visalia|California|141384
Clovis|California|125110
Modesto|California|218464
Stockton|California|320804
Lodi|California|66
Sacramento|California|524943
Roseville|California|147773
Elk Grove|California|176124
Folsom|California|81
Rancho Cordova|California|81
Chico|California|101475
Redding|California|93
Vacaville|California|102526
Santa Rosa|California|178127
Santa Maria|California|107604
San Luis Obispo|California|49
Oxnard|California|202063
Ventura|California|110763
Simi Valley|California|124166
Thousand Oaks|California|124659
Santa Clarita|California|228673
Palmdale|California|152750
Lancaster|California|173516
Riverside|California|314998
San Bernardino|California|222101
Fontana|California|212465
Moreno Valley|California|208634
Corona|California|157136
Rancho Cucamonga|California|174453
Ontario|California|175265
Pomona|California|151348
Pasadena|California|138699
Glendale|California|196543
Burbank|California|107337
Torrance|California|147067
Long Beach|California|466742
Santa Monica|California|91
Inglewood|California|107510
Compton|California|95
Downey|California|111772
Norwalk|California|102773
El Monte|California|106088
West Covina|California|106098
Whittier|California|87
Carlsbad|California|115382
Oceanside|California|174068
Escondido|California|151625
Chula Vista|California|275487
San Diego|California|1381611
Anaheim|California|346824
Santa Ana|California|310227
Irvine|California|314621
Huntington Beach|California|198711
Garden Grove|California|171949
Fullerton|California|135161
Costa Mesa|California|111918
Orange|California|139911
Newport Beach|California|85
` .trim();

export const US_CITIES: CityRecord[] = RAW_US_CITIES.split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [city, state, population] = line.split('|');
    return {
      city: city.trim(),
      state: state.trim(),
      population: Number(population),
    };
  })
  .filter(
    (entry) =>
      entry.city &&
      entry.state &&
      Number.isFinite(entry.population) &&
      entry.population >= 25000
  );

const RAW_US_COUNTIES = `
Los Angeles|California
San Diego|California
Orange|California
Riverside|California
San Bernardino|California
Santa Clara|California
Alameda|California
Sacramento|California
Contra Costa|California
Fresno|California
Harris|Texas
Dallas|Texas
Tarrant|Texas
Bexar|Texas
Travis|Texas
Collin|Texas
Hidalgo|Texas
El Paso|Texas
Denton|Texas
Fort Bend|Texas
Cook|Illinois
DuPage|Illinois
Lake|Illinois
Will|Illinois
Maricopa|Arizona
Pima|Arizona
Clark|Nevada
King|Washington
Pierce|Washington
Snohomish|Washington
Miami-Dade|Florida
Broward|Florida
Palm Beach|Florida
Hillsborough|Florida
Orange|Florida
Pinellas|Florida
Duval|Florida
Polk|Florida
Gwinnett|Georgia
Fulton|Georgia
Cobb|Georgia
DeKalb|Georgia
Wayne|Michigan
Oakland|Michigan
Macomb|Michigan
Hennepin|Minnesota
Ramsey|Minnesota
Hennepin|Minnesota
Philadelphia|Pennsylvania
Allegheny|Pennsylvania
Montgomery|Pennsylvania
Bucks|Pennsylvania
Franklin|Ohio
Cuyahoga|Ohio
Hamilton|Ohio
Summit|Ohio
Montgomery|Ohio
Mecklenburg|North Carolina
Wake|North Carolina
Guilford|North Carolina
Durham|North Carolina
Jefferson|Kentucky
Shelby|Tennessee
Davidson|Tennessee
Hinds|Mississippi
Shelby|Alabama
Jefferson|Alabama
Hennepin|Minnesota
St. Louis|Missouri
Jackson|Missouri
Marion|Indiana
Clark|Indiana
Jefferson|Colorado
Denver|Colorado
Arapahoe|Colorado
Douglas|Colorado
Salt Lake|Utah
Utah|Utah
Ada|Idaho
Latah|Idaho
Multnomah|Oregon
Washington|Oregon
Clackamas|Oregon
Suffolk|Massachusetts
Middlesex|Massachusetts
Essex|Massachusetts
Norfolk|Massachusetts
Fairfield|Connecticut
Hartford|Connecticut
New Haven|Connecticut
New Castle|Delaware
Hudson|New Jersey
Essex|New Jersey
Bergen|New Jersey
Middlesex|New Jersey
Mercer|New Jersey
Union|New Jersey
Ocean|New Jersey
Monmouth|New Jersey
Kings|New York
Queens|New York
New York|New York
Bronx|New York
Suffolk|New York
Nassau|New York
Westchester|New York
Erie|New York
` .trim();

export const US_COUNTIES: CountyRecord[] = RAW_US_COUNTIES.split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [county, state] = line.split('|');
    return {
      county: county.trim(),
      state: state.trim(),
    };
  })
  .filter((entry) => entry.county && entry.state);
