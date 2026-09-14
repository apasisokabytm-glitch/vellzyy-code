/**
 * Judul : Jadwal Sholat Indonesia Scraper
 * Base Url : https://www.jadwalsholat.org/
 * Author : Vellzyy
 * Deskripsi : Scraper jadwal sholat harian dan bulanan seluruh Indonesia dengan CLI terminal interaktif dan pencarian lokasi
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');

const BASE_URL = 'https://www.jadwalsholat.org';
const MONTHLY_URL = 'https://www.jadwalsholat.org/adzan/monthly.php';

const PRELOADED_TOWNS = [
  {
    "id": "317",
    "name": "Aceh Barat"
  },
  {
    "id": "318",
    "name": "Aceh Barat Daya"
  },
  {
    "id": "319",
    "name": "Aceh Besar"
  },
  {
    "id": "320",
    "name": "Aceh Jaya"
  },
  {
    "id": "321",
    "name": "Aceh Selatan"
  },
  {
    "id": "322",
    "name": "Aceh Singkil"
  },
  {
    "id": "323",
    "name": "Aceh Tamiang"
  },
  {
    "id": "324",
    "name": "Aceh Tengah"
  },
  {
    "id": "325",
    "name": "Aceh Tenggara"
  },
  {
    "id": "326",
    "name": "Aceh Timur"
  },
  {
    "id": "327",
    "name": "Aceh Utara"
  },
  {
    "id": "329",
    "name": "Agam"
  },
  {
    "id": "330",
    "name": "Alor"
  },
  {
    "id": "1",
    "name": "Ambarawa"
  },
  {
    "id": "2",
    "name": "Ambon"
  },
  {
    "id": "3",
    "name": "Amlapura"
  },
  {
    "id": "4",
    "name": "Amuntai"
  },
  {
    "id": "5",
    "name": "Argamakmur"
  },
  {
    "id": "331",
    "name": "Asahan"
  },
  {
    "id": "332",
    "name": "Asmat"
  },
  {
    "id": "6",
    "name": "Atambua"
  },
  {
    "id": "7",
    "name": "Babo"
  },
  {
    "id": "333",
    "name": "Badung"
  },
  {
    "id": "8",
    "name": "Bagan Siapiapi"
  },
  {
    "id": "316",
    "name": "Bahaur, Kalteng"
  },
  {
    "id": "9",
    "name": "Bajawa"
  },
  {
    "id": "334",
    "name": "Balangan"
  },
  {
    "id": "10",
    "name": "Balige"
  },
  {
    "id": "11",
    "name": "Balikpapan"
  },
  {
    "id": "12",
    "name": "Banda Aceh"
  },
  {
    "id": "335",
    "name": "Bandar Lampung"
  },
  {
    "id": "13",
    "name": "Bandarlampung"
  },
  {
    "id": "14",
    "name": "Bandung"
  },
  {
    "id": "336",
    "name": "Bandung Barat"
  },
  {
    "id": "337",
    "name": "Banggai"
  },
  {
    "id": "338",
    "name": "Banggai Kepulauan"
  },
  {
    "id": "339",
    "name": "Banggai Laut"
  },
  {
    "id": "340",
    "name": "Bangka"
  },
  {
    "id": "341",
    "name": "Bangka Barat"
  },
  {
    "id": "342",
    "name": "Bangka Selatan"
  },
  {
    "id": "343",
    "name": "Bangka Tengah"
  },
  {
    "id": "15",
    "name": "Bangkalan"
  },
  {
    "id": "16",
    "name": "Bangkinang"
  },
  {
    "id": "17",
    "name": "Bangko"
  },
  {
    "id": "18",
    "name": "Bangli"
  },
  {
    "id": "19",
    "name": "Banjar"
  },
  {
    "id": "20",
    "name": "Banjar Baru"
  },
  {
    "id": "344",
    "name": "Banjarbaru"
  },
  {
    "id": "21",
    "name": "Banjarmasin"
  },
  {
    "id": "22",
    "name": "Banjarnegara"
  },
  {
    "id": "23",
    "name": "Bantaeng"
  },
  {
    "id": "24",
    "name": "Banten"
  },
  {
    "id": "25",
    "name": "Bantul"
  },
  {
    "id": "345",
    "name": "Banyuasin"
  },
  {
    "id": "346",
    "name": "Banyumas"
  },
  {
    "id": "26",
    "name": "Banyuwangi"
  },
  {
    "id": "27",
    "name": "Barabai"
  },
  {
    "id": "28",
    "name": "Barito"
  },
  {
    "id": "347",
    "name": "Barito Kuala"
  },
  {
    "id": "348",
    "name": "Barito Selatan"
  },
  {
    "id": "349",
    "name": "Barito Timur"
  },
  {
    "id": "350",
    "name": "Barito Utara"
  },
  {
    "id": "29",
    "name": "Barru"
  },
  {
    "id": "30",
    "name": "Batam"
  },
  {
    "id": "31",
    "name": "Batang"
  },
  {
    "id": "351",
    "name": "Batanghari"
  },
  {
    "id": "32",
    "name": "Batu"
  },
  {
    "id": "352",
    "name": "Batu Bara"
  },
  {
    "id": "33",
    "name": "Baturaja"
  },
  {
    "id": "34",
    "name": "Batusangkar"
  },
  {
    "id": "353",
    "name": "Bau Bau"
  },
  {
    "id": "35",
    "name": "Baubau"
  },
  {
    "id": "36",
    "name": "Bekasi"
  },
  {
    "id": "354",
    "name": "Belitung"
  },
  {
    "id": "355",
    "name": "Belitung Timur"
  },
  {
    "id": "356",
    "name": "Belu"
  },
  {
    "id": "357",
    "name": "Bener Meriah"
  },
  {
    "id": "37",
    "name": "Bengkalis"
  },
  {
    "id": "358",
    "name": "Bengkayang"
  },
  {
    "id": "38",
    "name": "Bengkulu"
  },
  {
    "id": "359",
    "name": "Bengkulu Selatan"
  },
  {
    "id": "360",
    "name": "Bengkulu Tengah"
  },
  {
    "id": "361",
    "name": "Bengkulu Utara"
  },
  {
    "id": "39",
    "name": "Benteng"
  },
  {
    "id": "362",
    "name": "Berau"
  },
  {
    "id": "40",
    "name": "Biak"
  },
  {
    "id": "363",
    "name": "Biak Numfor"
  },
  {
    "id": "41",
    "name": "Bima"
  },
  {
    "id": "42",
    "name": "Binjai"
  },
  {
    "id": "364",
    "name": "Bintan"
  },
  {
    "id": "43",
    "name": "Bireuen"
  },
  {
    "id": "44",
    "name": "Bitung"
  },
  {
    "id": "45",
    "name": "Blitar"
  },
  {
    "id": "46",
    "name": "Blora"
  },
  {
    "id": "365",
    "name": "Boalemo"
  },
  {
    "id": "47",
    "name": "Bogor"
  },
  {
    "id": "48",
    "name": "Bojonegoro"
  },
  {
    "id": "366",
    "name": "Bolaang Mongondow"
  },
  {
    "id": "367",
    "name": "Bolaang Mongondow Selatan"
  },
  {
    "id": "368",
    "name": "Bolaang Mongondow Timur"
  },
  {
    "id": "369",
    "name": "Bolaang Mongondow Utara"
  },
  {
    "id": "370",
    "name": "Bombana"
  },
  {
    "id": "49",
    "name": "Bondowoso"
  },
  {
    "id": "371",
    "name": "Bone"
  },
  {
    "id": "372",
    "name": "Bone Bolango"
  },
  {
    "id": "50",
    "name": "Bontang"
  },
  {
    "id": "373",
    "name": "Boven Digoel"
  },
  {
    "id": "51",
    "name": "Boyolali"
  },
  {
    "id": "52",
    "name": "Brebes"
  },
  {
    "id": "53",
    "name": "Bukit Tinggi"
  },
  {
    "id": "374",
    "name": "Bukittinggi"
  },
  {
    "id": "315",
    "name": "Bula SBT, Maluku"
  },
  {
    "id": "375",
    "name": "Buleleng"
  },
  {
    "id": "54",
    "name": "Bulukumba"
  },
  {
    "id": "376",
    "name": "Bulungan"
  },
  {
    "id": "377",
    "name": "Bungo"
  },
  {
    "id": "55",
    "name": "Buntok"
  },
  {
    "id": "378",
    "name": "Buol"
  },
  {
    "id": "379",
    "name": "Buru"
  },
  {
    "id": "380",
    "name": "Buru Selatan"
  },
  {
    "id": "381",
    "name": "Buton"
  },
  {
    "id": "382",
    "name": "Buton Selatan"
  },
  {
    "id": "383",
    "name": "Buton Tengah"
  },
  {
    "id": "384",
    "name": "Buton Utara"
  },
  {
    "id": "56",
    "name": "Cepu"
  },
  {
    "id": "57",
    "name": "Ciamis"
  },
  {
    "id": "58",
    "name": "Cianjur"
  },
  {
    "id": "59",
    "name": "Cibinong"
  },
  {
    "id": "60",
    "name": "Cilacap"
  },
  {
    "id": "61",
    "name": "Cilegon"
  },
  {
    "id": "62",
    "name": "Cimahi"
  },
  {
    "id": "63",
    "name": "Cirebon"
  },
  {
    "id": "64",
    "name": "Curup"
  },
  {
    "id": "385",
    "name": "Dairi"
  },
  {
    "id": "386",
    "name": "Deiyai"
  },
  {
    "id": "387",
    "name": "Deli Serdang"
  },
  {
    "id": "65",
    "name": "Demak"
  },
  {
    "id": "66",
    "name": "Denpasar"
  },
  {
    "id": "67",
    "name": "Depok"
  },
  {
    "id": "388",
    "name": "Dharmasraya"
  },
  {
    "id": "68",
    "name": "Dili"
  },
  {
    "id": "389",
    "name": "Dogiyai"
  },
  {
    "id": "69",
    "name": "Dompu"
  },
  {
    "id": "70",
    "name": "Donggala"
  },
  {
    "id": "71",
    "name": "Dumai"
  },
  {
    "id": "390",
    "name": "Empat Lawang"
  },
  {
    "id": "72",
    "name": "Ende"
  },
  {
    "id": "73",
    "name": "Enggano"
  },
  {
    "id": "74",
    "name": "Enrekang"
  },
  {
    "id": "391",
    "name": "Fak Fak"
  },
  {
    "id": "75",
    "name": "Fakfak"
  },
  {
    "id": "392",
    "name": "Flores Timur"
  },
  {
    "id": "76",
    "name": "Garut"
  },
  {
    "id": "393",
    "name": "Gayo Lues"
  },
  {
    "id": "77",
    "name": "Gianyar"
  },
  {
    "id": "78",
    "name": "Gombong"
  },
  {
    "id": "79",
    "name": "Gorontalo"
  },
  {
    "id": "394",
    "name": "Gorontalo Utara"
  },
  {
    "id": "395",
    "name": "Gowa"
  },
  {
    "id": "80",
    "name": "Gresik"
  },
  {
    "id": "396",
    "name": "Grobogan"
  },
  {
    "id": "397",
    "name": "Gunung Mas"
  },
  {
    "id": "81",
    "name": "Gunung Sitoli"
  },
  {
    "id": "398",
    "name": "Gunungkidul"
  },
  {
    "id": "399",
    "name": "Gunungsitoli"
  },
  {
    "id": "400",
    "name": "Halmahera Barat"
  },
  {
    "id": "401",
    "name": "Halmahera Selatan"
  },
  {
    "id": "402",
    "name": "Halmahera Tengah"
  },
  {
    "id": "403",
    "name": "Halmahera Timur"
  },
  {
    "id": "404",
    "name": "Halmahera Utara"
  },
  {
    "id": "405",
    "name": "Hulu Sungai Selatan"
  },
  {
    "id": "406",
    "name": "Hulu Sungai Tengah"
  },
  {
    "id": "407",
    "name": "Hulu Sungai Utara"
  },
  {
    "id": "408",
    "name": "Humbang Hasundutan"
  },
  {
    "id": "409",
    "name": "Indragiri Hilir"
  },
  {
    "id": "410",
    "name": "Indragiri Hulu"
  },
  {
    "id": "82",
    "name": "Indramayu"
  },
  {
    "id": "411",
    "name": "Intan Jaya"
  },
  {
    "id": "309",
    "name": "Jakarta Barat"
  },
  {
    "id": "308",
    "name": "Jakarta Pusat"
  },
  {
    "id": "310",
    "name": "Jakarta Selatan"
  },
  {
    "id": "311",
    "name": "Jakarta Timur"
  },
  {
    "id": "312",
    "name": "Jakarta Utara"
  },
  {
    "id": "83",
    "name": "Jambi"
  },
  {
    "id": "84",
    "name": "Jayapura"
  },
  {
    "id": "412",
    "name": "Jayawijaya"
  },
  {
    "id": "85",
    "name": "Jember"
  },
  {
    "id": "413",
    "name": "Jembrana"
  },
  {
    "id": "86",
    "name": "Jeneponto"
  },
  {
    "id": "87",
    "name": "Jepara"
  },
  {
    "id": "88",
    "name": "Jombang"
  },
  {
    "id": "414",
    "name": "Kab Timor Tengah Selatan"
  },
  {
    "id": "89",
    "name": "Kabanjahe"
  },
  {
    "id": "415",
    "name": "Kaimana"
  },
  {
    "id": "90",
    "name": "Kalabahi"
  },
  {
    "id": "91",
    "name": "Kalianda"
  },
  {
    "id": "416",
    "name": "Kampar"
  },
  {
    "id": "92",
    "name": "Kandangan"
  },
  {
    "id": "417",
    "name": "Kapuas"
  },
  {
    "id": "418",
    "name": "Kapuas Hulu"
  },
  {
    "id": "93",
    "name": "Karanganyar"
  },
  {
    "id": "419",
    "name": "Karangasem"
  },
  {
    "id": "94",
    "name": "Karawang"
  },
  {
    "id": "420",
    "name": "Karimun"
  },
  {
    "id": "421",
    "name": "Karo"
  },
  {
    "id": "95",
    "name": "Kasungan"
  },
  {
    "id": "422",
    "name": "Katingan"
  },
  {
    "id": "423",
    "name": "Kaur"
  },
  {
    "id": "424",
    "name": "Kayong Utara"
  },
  {
    "id": "96",
    "name": "Kayuagung"
  },
  {
    "id": "97",
    "name": "Kebumen"
  },
  {
    "id": "98",
    "name": "Kediri"
  },
  {
    "id": "425",
    "name": "Keerom"
  },
  {
    "id": "99",
    "name": "Kefamenanu"
  },
  {
    "id": "100",
    "name": "Kendal"
  },
  {
    "id": "101",
    "name": "Kendari"
  },
  {
    "id": "328",
    "name": "Kep. Seribu"
  },
  {
    "id": "426",
    "name": "Kep. Siau Tagulandang Biaro"
  },
  {
    "id": "427",
    "name": "Kepahiang"
  },
  {
    "id": "428",
    "name": "Kepulauan Anambas"
  },
  {
    "id": "429",
    "name": "Kepulauan Aru"
  },
  {
    "id": "430",
    "name": "Kepulauan Mentawai"
  },
  {
    "id": "431",
    "name": "Kepulauan Meranti"
  },
  {
    "id": "432",
    "name": "Kepulauan Sangihe"
  },
  {
    "id": "433",
    "name": "Kepulauan Selayar"
  },
  {
    "id": "434",
    "name": "Kepulauan Sula"
  },
  {
    "id": "435",
    "name": "Kepulauan Talaud"
  },
  {
    "id": "436",
    "name": "Kepulauan Tanimbar"
  },
  {
    "id": "437",
    "name": "Kepulauan Yapen"
  },
  {
    "id": "438",
    "name": "Kerinci"
  },
  {
    "id": "102",
    "name": "Kertosono"
  },
  {
    "id": "103",
    "name": "Ketapang"
  },
  {
    "id": "104",
    "name": "Kisaran"
  },
  {
    "id": "105",
    "name": "Klaten"
  },
  {
    "id": "439",
    "name": "Klungkung"
  },
  {
    "id": "106",
    "name": "Kolaka"
  },
  {
    "id": "440",
    "name": "Kolaka Timur"
  },
  {
    "id": "441",
    "name": "Kolaka Utara"
  },
  {
    "id": "442",
    "name": "Konawe"
  },
  {
    "id": "443",
    "name": "Konawe Kepulauan"
  },
  {
    "id": "444",
    "name": "Konawe Selatan"
  },
  {
    "id": "445",
    "name": "Konawe Utara"
  },
  {
    "id": "107",
    "name": "Kota Baru Pulau Laut"
  },
  {
    "id": "108",
    "name": "Kota Bumi"
  },
  {
    "id": "109",
    "name": "Kota Jantho"
  },
  {
    "id": "446",
    "name": "Kotabaru"
  },
  {
    "id": "110",
    "name": "Kotamobagu"
  },
  {
    "id": "447",
    "name": "Kotawaringin Barat"
  },
  {
    "id": "448",
    "name": "Kotawaringin Timur"
  },
  {
    "id": "111",
    "name": "Kuala Kapuas"
  },
  {
    "id": "112",
    "name": "Kuala Kurun"
  },
  {
    "id": "113",
    "name": "Kuala Pembuang"
  },
  {
    "id": "114",
    "name": "Kuala Tungkal"
  },
  {
    "id": "449",
    "name": "Kuantan Singingi"
  },
  {
    "id": "450",
    "name": "Kubu Raya"
  },
  {
    "id": "115",
    "name": "Kudus"
  },
  {
    "id": "451",
    "name": "Kulon Progo"
  },
  {
    "id": "116",
    "name": "Kuningan"
  },
  {
    "id": "117",
    "name": "Kupang"
  },
  {
    "id": "118",
    "name": "Kutacane"
  },
  {
    "id": "452",
    "name": "Kutai Barat"
  },
  {
    "id": "453",
    "name": "Kutai Kartanegara"
  },
  {
    "id": "454",
    "name": "Kutai Timur"
  },
  {
    "id": "119",
    "name": "Kutoarjo"
  },
  {
    "id": "120",
    "name": "Labuhan"
  },
  {
    "id": "455",
    "name": "Labuhan Batu"
  },
  {
    "id": "456",
    "name": "Labuhan Batu Selatan"
  },
  {
    "id": "457",
    "name": "Labuhan Batu Utara"
  },
  {
    "id": "121",
    "name": "Lahat"
  },
  {
    "id": "458",
    "name": "Lamandau"
  },
  {
    "id": "122",
    "name": "Lamongan"
  },
  {
    "id": "459",
    "name": "Lampung Barat"
  },
  {
    "id": "460",
    "name": "Lampung Selatan"
  },
  {
    "id": "461",
    "name": "Lampung Tengah"
  },
  {
    "id": "462",
    "name": "Lampung Timur"
  },
  {
    "id": "463",
    "name": "Lampung Utara"
  },
  {
    "id": "464",
    "name": "Landak"
  },
  {
    "id": "465",
    "name": "Langkat"
  },
  {
    "id": "123",
    "name": "Langsa"
  },
  {
    "id": "466",
    "name": "Lanny Jaya"
  },
  {
    "id": "124",
    "name": "Larantuka"
  },
  {
    "id": "125",
    "name": "Lawang"
  },
  {
    "id": "467",
    "name": "Lebak"
  },
  {
    "id": "468",
    "name": "Lebong"
  },
  {
    "id": "469",
    "name": "Lembata"
  },
  {
    "id": "470",
    "name": "Lhokseumawe"
  },
  {
    "id": "126",
    "name": "Lhoseumawe"
  },
  {
    "id": "471",
    "name": "Lima Puluh Kota"
  },
  {
    "id": "127",
    "name": "Limboto"
  },
  {
    "id": "472",
    "name": "Lingga"
  },
  {
    "id": "473",
    "name": "Lombok Barat"
  },
  {
    "id": "474",
    "name": "Lombok Tengah"
  },
  {
    "id": "475",
    "name": "Lombok Timur"
  },
  {
    "id": "476",
    "name": "Lombok Utara"
  },
  {
    "id": "128",
    "name": "Lubuk Basung"
  },
  {
    "id": "129",
    "name": "Lubuk Linggau"
  },
  {
    "id": "130",
    "name": "Lubuk Pakam"
  },
  {
    "id": "131",
    "name": "Lubuk Sikaping"
  },
  {
    "id": "132",
    "name": "Lumajang"
  },
  {
    "id": "477",
    "name": "Luwu"
  },
  {
    "id": "478",
    "name": "Luwu Timur"
  },
  {
    "id": "479",
    "name": "Luwu Utara"
  },
  {
    "id": "133",
    "name": "Luwuk"
  },
  {
    "id": "134",
    "name": "Madiun"
  },
  {
    "id": "135",
    "name": "Magelang"
  },
  {
    "id": "136",
    "name": "Magetan"
  },
  {
    "id": "480",
    "name": "Mahakam Ulu"
  },
  {
    "id": "137",
    "name": "Majalengka"
  },
  {
    "id": "138",
    "name": "Majene"
  },
  {
    "id": "139",
    "name": "Makale"
  },
  {
    "id": "140",
    "name": "Makassar"
  },
  {
    "id": "481",
    "name": "Malaka"
  },
  {
    "id": "141",
    "name": "Malang"
  },
  {
    "id": "482",
    "name": "Malinau"
  },
  {
    "id": "483",
    "name": "Maluku Barat Daya"
  },
  {
    "id": "484",
    "name": "Maluku Tengah"
  },
  {
    "id": "485",
    "name": "Maluku Tenggara"
  },
  {
    "id": "486",
    "name": "Mamasa"
  },
  {
    "id": "487",
    "name": "Mamberamo Raya"
  },
  {
    "id": "488",
    "name": "Mamberamo Tengah"
  },
  {
    "id": "142",
    "name": "Mamuju"
  },
  {
    "id": "489",
    "name": "Mamuju Tengah"
  },
  {
    "id": "490",
    "name": "Manado"
  },
  {
    "id": "491",
    "name": "Mandailing Natal"
  },
  {
    "id": "492",
    "name": "Manggarai"
  },
  {
    "id": "493",
    "name": "Manggarai Barat"
  },
  {
    "id": "494",
    "name": "Manggarai Timur"
  },
  {
    "id": "143",
    "name": "Manna"
  },
  {
    "id": "144",
    "name": "Manokwari"
  },
  {
    "id": "495",
    "name": "Manokwari Selatan"
  },
  {
    "id": "496",
    "name": "Mappi"
  },
  {
    "id": "145",
    "name": "Marabahan"
  },
  {
    "id": "146",
    "name": "Maros"
  },
  {
    "id": "147",
    "name": "Martapura Kalsel"
  },
  {
    "id": "314",
    "name": "Masamba, Sulsel"
  },
  {
    "id": "148",
    "name": "Masohi"
  },
  {
    "id": "149",
    "name": "Mataram"
  },
  {
    "id": "150",
    "name": "Maumere"
  },
  {
    "id": "497",
    "name": "Maybrat"
  },
  {
    "id": "151",
    "name": "Medan"
  },
  {
    "id": "498",
    "name": "Melawi"
  },
  {
    "id": "152",
    "name": "Mempawah"
  },
  {
    "id": "153",
    "name": "Menado"
  },
  {
    "id": "154",
    "name": "Mentok"
  },
  {
    "id": "499",
    "name": "Merangin"
  },
  {
    "id": "155",
    "name": "Merauke"
  },
  {
    "id": "500",
    "name": "Mesuji"
  },
  {
    "id": "156",
    "name": "Metro"
  },
  {
    "id": "157",
    "name": "Meulaboh"
  },
  {
    "id": "501",
    "name": "Mimika"
  },
  {
    "id": "502",
    "name": "Minahasa"
  },
  {
    "id": "503",
    "name": "Minahasa Selatan"
  },
  {
    "id": "504",
    "name": "Minahasa Tenggara"
  },
  {
    "id": "505",
    "name": "Minahasa Utara"
  },
  {
    "id": "158",
    "name": "Mojokerto"
  },
  {
    "id": "506",
    "name": "Morowali"
  },
  {
    "id": "507",
    "name": "Morowali Utara"
  },
  {
    "id": "159",
    "name": "Muara Bulian"
  },
  {
    "id": "160",
    "name": "Muara Bungo"
  },
  {
    "id": "161",
    "name": "Muara Enim"
  },
  {
    "id": "162",
    "name": "Muara Teweh"
  },
  {
    "id": "508",
    "name": "Muaro Jambi"
  },
  {
    "id": "163",
    "name": "Muaro Sijunjung"
  },
  {
    "id": "509",
    "name": "Muko Muko"
  },
  {
    "id": "510",
    "name": "Muna"
  },
  {
    "id": "511",
    "name": "Muna Barat"
  },
  {
    "id": "164",
    "name": "Muntilan"
  },
  {
    "id": "512",
    "name": "Murung Raya"
  },
  {
    "id": "513",
    "name": "Musi Banyuasin"
  },
  {
    "id": "514",
    "name": "Musi Rawas"
  },
  {
    "id": "515",
    "name": "Musi Rawas Utara"
  },
  {
    "id": "165",
    "name": "Nabire"
  },
  {
    "id": "516",
    "name": "Nagan Raya"
  },
  {
    "id": "517",
    "name": "Nagekeo"
  },
  {
    "id": "518",
    "name": "Natuna"
  },
  {
    "id": "519",
    "name": "Nduga"
  },
  {
    "id": "166",
    "name": "Negara"
  },
  {
    "id": "520",
    "name": "Ngada"
  },
  {
    "id": "167",
    "name": "Nganjuk"
  },
  {
    "id": "168",
    "name": "Ngawi"
  },
  {
    "id": "521",
    "name": "Nias"
  },
  {
    "id": "522",
    "name": "Nias Barat"
  },
  {
    "id": "523",
    "name": "Nias Selatan"
  },
  {
    "id": "524",
    "name": "Nias Utara"
  },
  {
    "id": "169",
    "name": "Nunukan"
  },
  {
    "id": "525",
    "name": "Ogan Ilir"
  },
  {
    "id": "526",
    "name": "Ogan Komering Ilir"
  },
  {
    "id": "527",
    "name": "Ogan Komering Ulu"
  },
  {
    "id": "528",
    "name": "Ogan Komering Ulu Selatan"
  },
  {
    "id": "529",
    "name": "Ogan Komering Ulu Timur"
  },
  {
    "id": "170",
    "name": "Pacitan"
  },
  {
    "id": "171",
    "name": "Padang"
  },
  {
    "id": "530",
    "name": "Padang Lawas"
  },
  {
    "id": "531",
    "name": "Padang Lawas Utara"
  },
  {
    "id": "172",
    "name": "Padang Panjang"
  },
  {
    "id": "532",
    "name": "Padang Pariaman"
  },
  {
    "id": "173",
    "name": "Padang Sidempuan"
  },
  {
    "id": "533",
    "name": "Padangsidimpuan"
  },
  {
    "id": "534",
    "name": "Pagar Alam"
  },
  {
    "id": "174",
    "name": "Pagaralam"
  },
  {
    "id": "535",
    "name": "Pahuwato"
  },
  {
    "id": "175",
    "name": "Painan"
  },
  {
    "id": "536",
    "name": "Pakpak Bharat"
  },
  {
    "id": "176",
    "name": "Palangkaraya"
  },
  {
    "id": "177",
    "name": "Palembang"
  },
  {
    "id": "178",
    "name": "Palopo"
  },
  {
    "id": "179",
    "name": "Palu"
  },
  {
    "id": "180",
    "name": "Pamekasan"
  },
  {
    "id": "181",
    "name": "Pandeglang"
  },
  {
    "id": "537",
    "name": "Pangandaran"
  },
  {
    "id": "182",
    "name": "Pangkajene"
  },
  {
    "id": "538",
    "name": "Pangkajene Kepulauan"
  },
  {
    "id": "183",
    "name": "Pangkajene Sidenreng"
  },
  {
    "id": "539",
    "name": "Pangkal Pinang"
  },
  {
    "id": "184",
    "name": "Pangkalan Bun"
  },
  {
    "id": "185",
    "name": "Pangkalpinang"
  },
  {
    "id": "540",
    "name": "Paniai"
  },
  {
    "id": "186",
    "name": "Panyabungan"
  },
  {
    "id": "187",
    "name": "Pare"
  },
  {
    "id": "188",
    "name": "Parepare"
  },
  {
    "id": "189",
    "name": "Pariaman"
  },
  {
    "id": "541",
    "name": "Parigi Moutong"
  },
  {
    "id": "542",
    "name": "Pasaman"
  },
  {
    "id": "543",
    "name": "Pasaman Barat"
  },
  {
    "id": "544",
    "name": "Pasangkayu"
  },
  {
    "id": "545",
    "name": "Paser"
  },
  {
    "id": "190",
    "name": "Pasuruan"
  },
  {
    "id": "191",
    "name": "Pati"
  },
  {
    "id": "192",
    "name": "Payakumbuh"
  },
  {
    "id": "546",
    "name": "Pegunungan Arfak"
  },
  {
    "id": "547",
    "name": "Pegunungan Bintang"
  },
  {
    "id": "193",
    "name": "Pekalongan"
  },
  {
    "id": "194",
    "name": "Pekan Baru"
  },
  {
    "id": "548",
    "name": "Pekanbaru"
  },
  {
    "id": "549",
    "name": "Pelalawan"
  },
  {
    "id": "195",
    "name": "Pemalang"
  },
  {
    "id": "196",
    "name": "Pematangsiantar"
  },
  {
    "id": "550",
    "name": "Penajam Paser Utara"
  },
  {
    "id": "197",
    "name": "Pendopo"
  },
  {
    "id": "551",
    "name": "Penukal Abab Lematang Ilir"
  },
  {
    "id": "552",
    "name": "Pesawaran"
  },
  {
    "id": "553",
    "name": "Pesisir Barat"
  },
  {
    "id": "554",
    "name": "Pesisir Selatan"
  },
  {
    "id": "555",
    "name": "Pidie"
  },
  {
    "id": "556",
    "name": "Pidie Jaya"
  },
  {
    "id": "198",
    "name": "Pinrang"
  },
  {
    "id": "199",
    "name": "Pleihari"
  },
  {
    "id": "200",
    "name": "Polewali"
  },
  {
    "id": "557",
    "name": "Polewali Mandar"
  },
  {
    "id": "201",
    "name": "Pondok Gede"
  },
  {
    "id": "202",
    "name": "Ponorogo"
  },
  {
    "id": "203",
    "name": "Pontianak"
  },
  {
    "id": "204",
    "name": "Poso"
  },
  {
    "id": "205",
    "name": "Prabumulih"
  },
  {
    "id": "206",
    "name": "Praya"
  },
  {
    "id": "558",
    "name": "Pringsewu"
  },
  {
    "id": "207",
    "name": "Probolinggo"
  },
  {
    "id": "559",
    "name": "Pulang Pisau"
  },
  {
    "id": "560",
    "name": "Pulau Morotai"
  },
  {
    "id": "561",
    "name": "Pulau Taliabu"
  },
  {
    "id": "562",
    "name": "Puncak"
  },
  {
    "id": "563",
    "name": "Puncak Jaya"
  },
  {
    "id": "208",
    "name": "Purbalingga"
  },
  {
    "id": "209",
    "name": "Purukcahu"
  },
  {
    "id": "210",
    "name": "Purwakarta"
  },
  {
    "id": "211",
    "name": "Purwodadigrobogan"
  },
  {
    "id": "212",
    "name": "Purwokerto"
  },
  {
    "id": "213",
    "name": "Purworejo"
  },
  {
    "id": "214",
    "name": "Putussibau"
  },
  {
    "id": "215",
    "name": "Raha"
  },
  {
    "id": "564",
    "name": "Raja Ampat"
  },
  {
    "id": "216",
    "name": "Rangkasbitung"
  },
  {
    "id": "217",
    "name": "Rantau"
  },
  {
    "id": "218",
    "name": "Rantauprapat"
  },
  {
    "id": "219",
    "name": "Rantepao"
  },
  {
    "id": "565",
    "name": "Rejang Lebong"
  },
  {
    "id": "220",
    "name": "Rembang"
  },
  {
    "id": "221",
    "name": "Rengat"
  },
  {
    "id": "566",
    "name": "Rokan Hilir"
  },
  {
    "id": "567",
    "name": "Rokan Hulu"
  },
  {
    "id": "568",
    "name": "Rote Ndao"
  },
  {
    "id": "222",
    "name": "Ruteng"
  },
  {
    "id": "223",
    "name": "Sabang"
  },
  {
    "id": "569",
    "name": "Sabu Raijua"
  },
  {
    "id": "224",
    "name": "Salatiga"
  },
  {
    "id": "225",
    "name": "Samarinda"
  },
  {
    "id": "570",
    "name": "Sambas"
  },
  {
    "id": "313",
    "name": "Sambas, Kalbar"
  },
  {
    "id": "571",
    "name": "Samosir"
  },
  {
    "id": "226",
    "name": "Sampang"
  },
  {
    "id": "227",
    "name": "Sampit"
  },
  {
    "id": "228",
    "name": "Sanggau"
  },
  {
    "id": "572",
    "name": "Sarmi"
  },
  {
    "id": "573",
    "name": "Sarolangun"
  },
  {
    "id": "229",
    "name": "Sawahlunto"
  },
  {
    "id": "574",
    "name": "Sekadau"
  },
  {
    "id": "230",
    "name": "Sekayu"
  },
  {
    "id": "231",
    "name": "Selong"
  },
  {
    "id": "575",
    "name": "Seluma"
  },
  {
    "id": "232",
    "name": "Semarang"
  },
  {
    "id": "233",
    "name": "Sengkang"
  },
  {
    "id": "576",
    "name": "Seram Bagian Barat"
  },
  {
    "id": "577",
    "name": "Seram Bagian Timur"
  },
  {
    "id": "234",
    "name": "Serang"
  },
  {
    "id": "578",
    "name": "Serdang Bedagai"
  },
  {
    "id": "235",
    "name": "Serui"
  },
  {
    "id": "579",
    "name": "Seruyan"
  },
  {
    "id": "580",
    "name": "Siak"
  },
  {
    "id": "236",
    "name": "Sibolga"
  },
  {
    "id": "581",
    "name": "Sidenreng Rappang"
  },
  {
    "id": "237",
    "name": "Sidikalang"
  },
  {
    "id": "238",
    "name": "Sidoarjo"
  },
  {
    "id": "582",
    "name": "Sigi"
  },
  {
    "id": "239",
    "name": "Sigli"
  },
  {
    "id": "583",
    "name": "Sijunjung"
  },
  {
    "id": "584",
    "name": "Sikka"
  },
  {
    "id": "585",
    "name": "Simalungun"
  },
  {
    "id": "586",
    "name": "Simeulue"
  },
  {
    "id": "240",
    "name": "Singaparna"
  },
  {
    "id": "241",
    "name": "Singaraja"
  },
  {
    "id": "242",
    "name": "Singkawang"
  },
  {
    "id": "243",
    "name": "Sinjai"
  },
  {
    "id": "244",
    "name": "Sintang"
  },
  {
    "id": "245",
    "name": "Situbondo"
  },
  {
    "id": "246",
    "name": "Slawi"
  },
  {
    "id": "247",
    "name": "Sleman"
  },
  {
    "id": "248",
    "name": "Soasiu"
  },
  {
    "id": "249",
    "name": "Soe"
  },
  {
    "id": "250",
    "name": "Solo"
  },
  {
    "id": "251",
    "name": "Solok"
  },
  {
    "id": "587",
    "name": "Solok Selatan"
  },
  {
    "id": "588",
    "name": "Soppeng"
  },
  {
    "id": "252",
    "name": "Soreang"
  },
  {
    "id": "253",
    "name": "Sorong"
  },
  {
    "id": "589",
    "name": "Sorong Selatan"
  },
  {
    "id": "254",
    "name": "Sragen"
  },
  {
    "id": "255",
    "name": "Stabat"
  },
  {
    "id": "256",
    "name": "Subang"
  },
  {
    "id": "590",
    "name": "Subulussalam"
  },
  {
    "id": "257",
    "name": "Sukabumi"
  },
  {
    "id": "591",
    "name": "Sukamara"
  },
  {
    "id": "258",
    "name": "Sukoharjo"
  },
  {
    "id": "592",
    "name": "Sumba Barat"
  },
  {
    "id": "593",
    "name": "Sumba Barat Daya"
  },
  {
    "id": "594",
    "name": "Sumba Tengah"
  },
  {
    "id": "595",
    "name": "Sumba Timur"
  },
  {
    "id": "596",
    "name": "Sumbawa"
  },
  {
    "id": "597",
    "name": "Sumbawa Barat"
  },
  {
    "id": "259",
    "name": "Sumbawa Besar"
  },
  {
    "id": "260",
    "name": "Sumedang"
  },
  {
    "id": "261",
    "name": "Sumenep"
  },
  {
    "id": "262",
    "name": "Sungai Liat"
  },
  {
    "id": "263",
    "name": "Sungai Penuh"
  },
  {
    "id": "264",
    "name": "Sungguminasa"
  },
  {
    "id": "598",
    "name": "Supiori"
  },
  {
    "id": "265",
    "name": "Surabaya"
  },
  {
    "id": "266",
    "name": "Surakarta"
  },
  {
    "id": "599",
    "name": "Tabalong"
  },
  {
    "id": "267",
    "name": "Tabanan"
  },
  {
    "id": "268",
    "name": "Tahuna"
  },
  {
    "id": "269",
    "name": "Takalar"
  },
  {
    "id": "270",
    "name": "Takengon"
  },
  {
    "id": "600",
    "name": "Tambrauw"
  },
  {
    "id": "271",
    "name": "Tamiang Layang"
  },
  {
    "id": "601",
    "name": "Tana Tidung"
  },
  {
    "id": "602",
    "name": "Tana Toraja"
  },
  {
    "id": "603",
    "name": "Tanah Bumbu"
  },
  {
    "id": "604",
    "name": "Tanah Datar"
  },
  {
    "id": "272",
    "name": "Tanah Grogot"
  },
  {
    "id": "605",
    "name": "Tanah Laut"
  },
  {
    "id": "273",
    "name": "Tangerang"
  },
  {
    "id": "606",
    "name": "Tangerang Selatan"
  },
  {
    "id": "607",
    "name": "Tanggamus"
  },
  {
    "id": "274",
    "name": "Tanjung Balai"
  },
  {
    "id": "275",
    "name": "Tanjung Enim"
  },
  {
    "id": "608",
    "name": "Tanjung Jabung Barat"
  },
  {
    "id": "609",
    "name": "Tanjung Jabung Timur"
  },
  {
    "id": "276",
    "name": "Tanjung Pandan"
  },
  {
    "id": "277",
    "name": "Tanjung Pinang"
  },
  {
    "id": "278",
    "name": "Tanjung Redep"
  },
  {
    "id": "279",
    "name": "Tanjung Selor"
  },
  {
    "id": "280",
    "name": "Tapak Tuan"
  },
  {
    "id": "610",
    "name": "Tapanuli Selatan"
  },
  {
    "id": "611",
    "name": "Tapanuli Tengah"
  },
  {
    "id": "612",
    "name": "Tapanuli Utara"
  },
  {
    "id": "613",
    "name": "Tapin"
  },
  {
    "id": "281",
    "name": "Tarakan"
  },
  {
    "id": "282",
    "name": "Tarutung"
  },
  {
    "id": "283",
    "name": "Tasikmalaya"
  },
  {
    "id": "284",
    "name": "Tebing Tinggi"
  },
  {
    "id": "614",
    "name": "Tebo"
  },
  {
    "id": "285",
    "name": "Tegal"
  },
  {
    "id": "615",
    "name": "Teluk Bintuni"
  },
  {
    "id": "616",
    "name": "Teluk Wondama"
  },
  {
    "id": "286",
    "name": "Temanggung"
  },
  {
    "id": "287",
    "name": "Tembilahan"
  },
  {
    "id": "288",
    "name": "Tenggarong"
  },
  {
    "id": "289",
    "name": "Ternate"
  },
  {
    "id": "617",
    "name": "Tidore Kepulauan"
  },
  {
    "id": "618",
    "name": "Timor Tengah Utara"
  },
  {
    "id": "619",
    "name": "Toba"
  },
  {
    "id": "620",
    "name": "Tojo Una Una"
  },
  {
    "id": "621",
    "name": "Toli Toli"
  },
  {
    "id": "622",
    "name": "Tolikara"
  },
  {
    "id": "290",
    "name": "Tolitoli"
  },
  {
    "id": "623",
    "name": "Tomohon"
  },
  {
    "id": "291",
    "name": "Tondano"
  },
  {
    "id": "624",
    "name": "Toraja Utara"
  },
  {
    "id": "292",
    "name": "Trenggalek"
  },
  {
    "id": "293",
    "name": "Tual"
  },
  {
    "id": "294",
    "name": "Tuban"
  },
  {
    "id": "625",
    "name": "Tulang Bawang"
  },
  {
    "id": "626",
    "name": "Tulang Bawang Barat"
  },
  {
    "id": "295",
    "name": "Tulung Agung"
  },
  {
    "id": "627",
    "name": "Tulungagung"
  },
  {
    "id": "296",
    "name": "Ujung Berung"
  },
  {
    "id": "297",
    "name": "Ungaran"
  },
  {
    "id": "298",
    "name": "Waikabubak"
  },
  {
    "id": "299",
    "name": "Waingapu"
  },
  {
    "id": "628",
    "name": "Wajo"
  },
  {
    "id": "629",
    "name": "Wakatobi"
  },
  {
    "id": "300",
    "name": "Wamena"
  },
  {
    "id": "630",
    "name": "Waropen"
  },
  {
    "id": "301",
    "name": "Watampone"
  },
  {
    "id": "302",
    "name": "Watansoppeng"
  },
  {
    "id": "303",
    "name": "Wates"
  },
  {
    "id": "631",
    "name": "Way Kanan"
  },
  {
    "id": "304",
    "name": "Wonogiri"
  },
  {
    "id": "305",
    "name": "Wonosari"
  },
  {
    "id": "306",
    "name": "Wonosobo"
  },
  {
    "id": "632",
    "name": "Yahukimo"
  },
  {
    "id": "633",
    "name": "Yalimo"
  },
  {
    "id": "307",
    "name": "Yogyakarta"
  }
];

const client = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
  }
});

async function getTowns(options = {}) {
  if (!options.forceRefresh && PRELOADED_TOWNS && PRELOADED_TOWNS.length > 0) {
    return PRELOADED_TOWNS;
  }

  try {
    const response = await client.get(MONTHLY_URL);
    const $ = cheerio.load(response.data);
    const towns = [];

    $('select.town-select option').each((_, el) => {
      const id = $(el).attr('value') ? $(el).attr('value').trim() : '';
      const name = $(el).text().trim();
      if (id && name) {
        towns.push({ id, name });
      }
    });

    return towns.length > 0 ? towns : PRELOADED_TOWNS;
  } catch (error) {
    if (PRELOADED_TOWNS && PRELOADED_TOWNS.length > 0) {
      return PRELOADED_TOWNS;
    }
    throw new Error('Gagal memuat daftar kota: ' + error.message);
  }
}

function searchTowns(query, townsList = PRELOADED_TOWNS) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const raw = query.trim().toLowerCase();
  const aliasMap = {
    'jogja': 'yogyakarta',
    'jogjakarta': 'yogyakarta',
    'yogya': 'yogyakarta',
    'jakpus': 'jakarta pusat',
    'jakbar': 'jakarta barat',
    'jaksel': 'jakarta selatan',
    'jaktim': 'jakarta timur',
    'jakut': 'jakarta utara',
    'bdg': 'bandung',
    'sby': 'surabaya',
    'smg': 'semarang',
    'bkn': 'pekanbaru'
  };

  const normalized = aliasMap[raw] || raw;

  const exact = townsList.filter(t => t.name.toLowerCase() === normalized);
  const startsWith = townsList.filter(t => 
    t.name.toLowerCase().startsWith(normalized) && 
    !exact.some(e => e.id === t.id)
  );
  const contains = townsList.filter(t => 
    t.name.toLowerCase().includes(normalized) && 
    !exact.some(e => e.id === t.id) && 
    !startsWith.some(s => s.id === t.id)
  );

  return [...exact, ...startsWith, ...contains];
}

async function getJadwal(locationQueryOrId, options = {}) {
  let targetTown = null;
  const towns = await getTowns();

  if (typeof locationQueryOrId === 'number' || (typeof locationQueryOrId === 'string' && /^\d+$/.test(locationQueryOrId.trim()))) {
    const idStr = String(locationQueryOrId).trim();
    targetTown = towns.find(t => t.id === idStr) || { id: idStr, name: 'Kota (ID: ' + idStr + ')' };
  } else if (typeof locationQueryOrId === 'string' && locationQueryOrId.trim()) {
    const matches = searchTowns(locationQueryOrId, towns);
    if (matches.length === 0) {
      throw new Error('Lokasi "' + locationQueryOrId + '" tidak ditemukan. Coba gunakan kata kunci kota lain.');
    }
    const idx = options.townIndex !== undefined ? options.townIndex : 0;
    targetTown = matches[idx] || matches[0];
  } else {
    targetTown = towns.find(t => t.name.toLowerCase() === 'jakarta pusat') || towns[0];
  }

  const now = new Date();
  const month = options.month ? parseInt(options.month, 10) : (now.getMonth() + 1);
  const year = options.year ? parseInt(options.year, 10) : now.getFullYear();

  if (isNaN(month) || month < 1 || month > 12) {
    throw new Error('Parameter bulan harus berupa angka antara 1 sampai 12.');
  }

  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new Error('Parameter tahun harus berupa angka tahun yang valid (contoh: 2026).');
  }

  try {
    const response = await client.get(MONTHLY_URL, {
      params: {
        id: targetTown.id,
        m: month,
        y: year
      }
    });

    const $ = cheerio.load(response.data);

    const selectedOption = $('select.town-select option[selected]');
    const namaKota = selectedOption.text().trim() || 
                     $('h1').first().text().replace(/^Jadwal Sholat\s*/i, '').trim() || 
                     targetTown.name;

    const periodeNama = $('h2').first().text().trim() || ('Bulan ' + month + ' ' + year);
    const tanggalLengkapHariIni = $('h1.text-lg').text().trim() || '';

    const jadwalBulanan = [];
    let hariIniData = null;

    $('#schedule-table tbody tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length >= 10) {
        const masehiDateText = $(tds[0]).find('.masehi-date-text').text().trim() || $(tds[0]).text().trim().substring(0, 2);
        const hijriahDateText = $(tds[1]).text().trim();
        const imsak = $(tds[2]).text().trim();
        const subuh = $(tds[3]).text().trim();
        const terbit = $(tds[4]).text().trim();
        const dhuha = $(tds[5]).text().trim();
        const dzuhur = $(tds[6]).text().trim();
        const ashar = $(tds[7]).text().trim();
        const maghrib = $(tds[8]).text().trim();
        const isya = $(tds[9]).text().trim();

        const rowItem = {
          tanggal: masehiDateText,
          hijriah: hijriahDateText,
          imsak,
          subuh,
          terbit,
          dhuha,
          dzuhur,
          ashar,
          maghrib,
          isya
        };

        jadwalBulanan.push(rowItem);

        if ($(tr).hasClass('active')) {
          hariIniData = {
            ...rowItem,
            tanggal_lengkap: tanggalLengkapHariIni
          };
        }
      }
    });

    if (!hariIniData && jadwalBulanan.length > 0) {
      const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
      if (isCurrentMonth) {
        const todayNumStr = String(now.getDate()).padStart(2, '0');
        const matchToday = jadwalBulanan.find(j => j.tanggal === todayNumStr || parseInt(j.tanggal, 10) === now.getDate());
        if (matchToday) {
          hariIniData = {
            ...matchToday,
            tanggal_lengkap: tanggalLengkapHariIni
          };
        }
      }
    }

    return {
      status: true,
      data: {
        lokasi: {
          id: targetTown.id,
          nama: namaKota,
          url: MONTHLY_URL + '?id=' + targetTown.id + '&m=' + month + '&y=' + year
        },
        periode: {
          nama: periodeNama,
          bulan: month,
          tahun: year
        },
        hari_ini: hariIniData,
        jadwal_bulanan: jadwalBulanan,
        total_hari: jadwalBulanan.length
      }
    };
  } catch (error) {
    throw new Error('Gagal mengambil jadwal sholat: ' + error.message);
  }
}

function printCard(data) {
  const loc = data.lokasi;
  const period = data.periode;
  const today = data.hari_ini;

  console.log('='.repeat(66));
  console.log('                   JADWAL SHOLAT INDONESIA');
  console.log('            Sumber: https://www.jadwalsholat.org/');
  console.log('='.repeat(66));
  console.log(' Lokasi          : ' + loc.nama + ' (ID: ' + loc.id + ')');
  if (today && today.tanggal_lengkap) {
    console.log(' Hari / Tanggal  : ' + today.tanggal_lengkap);
  }
  if (today && today.hijriah) {
    console.log(' Kalender Hijriah: ' + today.hijriah);
  }
  console.log(' Periode         : ' + period.nama);
  console.log('-'.repeat(66));

  if (today) {
    console.log('                    WAKTU SHOLAT HARI INI');
    console.log('-'.repeat(66));
    console.log('   [ Imsak   ]  ' + today.imsak + ' WIB');
    console.log('   [ Subuh   ]  ' + today.subuh + ' WIB');
    console.log('   [ Terbit  ]  ' + today.terbit + ' WIB');
    console.log('   [ Dhuha   ]  ' + today.dhuha + ' WIB');
    console.log('   [ Dzuhur  ]  ' + today.dzuhur + ' WIB');
    console.log('   [ Ashar   ]  ' + today.ashar + ' WIB');
    console.log('   [ Maghrib ]  ' + today.maghrib + ' WIB');
    console.log('   [ Isya    ]  ' + today.isya + ' WIB');
  } else {
    console.log('   (Data jadwal sholat hari ini tidak tersedia untuk periode ini)');
  }
  console.log('='.repeat(66));
}

function printMonthlyTable(data) {
  const list = data.jadwal_bulanan || [];
  const todayDate = data.hari_ini ? data.hari_ini.tanggal : null;

  console.log('\nJADWAL SHOLAT SEBULAN PENUH - ' + data.lokasi.nama + ' (' + data.periode.nama + ')');
  console.log('-'.repeat(88));
  console.log(
    'Tgl'.padEnd(5) +
    'Hijriyah'.padEnd(25) +
    'Imsak'.padEnd(8) +
    'Subuh'.padEnd(8) +
    'Terbit'.padEnd(8) +
    'Dhuha'.padEnd(8) +
    'Dzuhur'.padEnd(8) +
    'Ashar'.padEnd(8) +
    'Maghrib'.padEnd(9) +
    'Isya'
  );
  console.log('-'.repeat(88));

  for (const item of list) {
    const isToday = todayDate && item.tanggal === todayDate;
    const prefix = isToday ? '*' : ' ';
    const tglStr = (prefix + item.tanggal).padEnd(5);
    const hijriahStr = (item.hijriah || '-').padEnd(25);
    const imsakStr = (item.imsak || '-').padEnd(8);
    const subuhStr = (item.subuh || '-').padEnd(8);
    const terbitStr = (item.terbit || '-').padEnd(8);
    const dhuhaStr = (item.dhuha || '-').padEnd(8);
    const dzuhurStr = (item.dzuhur || '-').padEnd(8);
    const asharStr = (item.ashar || '-').padEnd(8);
    const maghribStr = (item.maghrib || '-').padEnd(9);
    const isyaStr = item.isya || '-';

    console.log(tglStr + hijriahStr + imsakStr + subuhStr + terbitStr + dhuhaStr + dzuhurStr + asharStr + maghribStr + isyaStr);
  }
  console.log('-'.repeat(88));
  if (todayDate) {
    console.log('Catatan: Tanda (*) menandakan hari ini\n');
  }
}

function ask(rl, query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer.trim());
    });
  });
}

async function runCli() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const isMonthly = args.includes('--monthly') || args.includes('--all');

  let searchKeyword = null;
  let monthArg = null;
  let yearArg = null;
  let idArg = null;
  const positionalArgs = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json' || arg === '--monthly' || arg === '--all') {
      continue;
    } else if (arg.startsWith('--search=')) {
      searchKeyword = arg.split('=')[1];
    } else if (arg === '--search' || arg === '-s') {
      searchKeyword = args[++i] || '';
    } else if (arg.startsWith('--month=')) {
      monthArg = arg.split('=')[1];
    } else if (arg.startsWith('--year=')) {
      yearArg = arg.split('=')[1];
    } else if (arg.startsWith('--id=')) {
      idArg = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      positionalArgs.push(arg);
    }
  }

  if (searchKeyword !== null) {
    const towns = await getTowns();
    const results = searchTowns(searchKeyword, towns);
    if (isJson) {
      console.log(JSON.stringify({ status: true, total: results.length, data: results }, null, 2));
    } else {
      console.log('\nHasil pencarian lokasi untuk "' + searchKeyword + '": (' + results.length + ' ditemukan)\n');
      results.forEach((t, idx) => {
        console.log('  [' + (idx + 1) + '] ' + t.name + ' (ID: ' + t.id + ')');
      });
      console.log('');
    }
    return;
  }

  const queryLoc = idArg || positionalArgs.join(' ').trim();
  const isInteractive = process.stdin.isTTY && !queryLoc && !idArg;

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('='.repeat(66));
    console.log('         JADWAL SHOLAT INDONESIA - CLI TERMINAL');
    console.log('          Sumber: https://www.jadwalsholat.org/');
    console.log('='.repeat(66));
    console.log('');

    try {
      const inputLoc = await ask(rl, 'Masukkan nama Kota / Kabupaten: ');
      if (!inputLoc) {
        console.log('Nama kota tidak boleh kosong.');
        rl.close();
        return;
      }

      const towns = await getTowns();
      const matches = searchTowns(inputLoc, towns);

      if (matches.length === 0) {
        console.log('\nLokasi "' + inputLoc + '" tidak ditemukan dalam daftar.');
        rl.close();
        return;
      }

      let selectedTown = matches[0];

      if (matches.length > 1) {
        console.log('\nDitemukan ' + matches.length + ' lokasi yang cocok:');
        const maxDisplay = Math.min(matches.length, 10);
        for (let i = 0; i < maxDisplay; i++) {
          console.log('  [' + (i + 1) + '] ' + matches[i].name + ' (ID: ' + matches[i].id + ')');
        }
        if (matches.length > 10) {
          console.log('  ... dan ' + (matches.length - 10) + ' lokasi lainnya.');
        }

        const choice = await ask(rl, '\nPilih nomor (1-' + maxDisplay + ') [default: 1]: ');
        const choiceNum = parseInt(choice, 10);
        if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= maxDisplay) {
          selectedTown = matches[choiceNum - 1];
        }
      }

      const viewChoice = await ask(rl, 'Tampilkan jadwal: [1] Hari Ini, [2] Sebulan Penuh (1/2) [default: 1]: ');
      const showMonthly = viewChoice === '2';

      console.log('\nMengambil jadwal sholat untuk ' + selectedTown.name + '...\n');

      const res = await getJadwal(selectedTown.id, {
        month: monthArg,
        year: yearArg
      });

      if (isJson) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        printCard(res.data);
        if (showMonthly) {
          printMonthlyTable(res.data);
        }
      }
    } finally {
      rl.close();
    }
  } else {
    const targetLoc = queryLoc || 'Jakarta Pusat';
    const towns = await getTowns();
    const matches = searchTowns(targetLoc, towns);

    let chosenIdOrName = targetLoc;
    if (matches.length > 0) {
      chosenIdOrName = matches[0].id;
      if (!isJson && matches.length > 1) {
        console.log('[Info] Ditemukan ' + matches.length + ' lokasi cocok. Memilih lokasi utama: ' + matches[0].name + ' (ID: ' + matches[0].id + ')');
      }
    }

    const res = await getJadwal(chosenIdOrName, {
      month: monthArg,
      year: yearArg
    });

    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      printCard(res.data);
      if (isMonthly) {
        printMonthlyTable(res.data);
      }
    }
  }
}

if (require.main === module) {
  runCli().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  getJadwal,
  getTowns,
  searchTowns
};
