export type CountryInfo = {
    code: string,
    name: string,
    longitude: number,
    latitude: number,
    names: { [lang: string]: string }
}

export type GeogridCountryDetails = {
    flagInfo: {
        colorsOnFlag: string[],
        hasStar: boolean,
        hasCoatOfArms: boolean,
        hasAnimal: boolean
    },
    geographyInfo: {
        islandNation: boolean, //
        landlocked: boolean, //
        coastlineLength: number, //
        coastline: string[],
        touchesSahara: boolean, //
        borderCountOverride: number,
        rivers: string[], //
        touchesEurasionSteppe: boolean, //
        touchesEquator: boolean, //
        top10Lakes: boolean //
    },
    economicInfo: {
        HDI?: number, //
        GDPPerCapita?: number, //
        top20WheatProduction: boolean, //
        top20OilProduction: boolean, //
        top20RenewableElectricityProduction: boolean, //
        producesNuclearPower: boolean //
    },
    politicalInfo: {
        isMonarchy: boolean, //
        inEU: boolean, //
        hasNuclearWeapons: boolean, //
        wasUSSR: boolean, //
        inCommonwealth: boolean, //
        officialLanguageCodes?: string[], //
        timeZones: string[],
        observesDST: boolean, //
        sameSexMarriageLegal: boolean, //
        sameSexActivitiesIllegal: boolean, //
        CPI: number | null, //
        isTerritory: boolean
    },
    sportsInfo: {
        olympicMedals: number, //
        hostedF1: boolean, //
        hostedOlympics: boolean, //
        hostedMensWorldCup: boolean, //
        playedMensWorldCup: boolean, //
        wonMensWorldCup: boolean //
    },
    factsInfo: {
        drivesLeft: boolean, //
        hasAlcoholBan: boolean, //
        has50Skyscrapers: boolean, //
        top20ObesityRate: boolean, //
        top20ChocolateConsumption: boolean, //
        top20AlcoholConsumption: boolean, //
        top20PopulationDensity: boolean, //
        bottom20PopulationDensity: boolean, //
        top20TourismRate: boolean, //
        top20RailSize: boolean, //
        top20WorldHeritageSites: boolean, //
        airPollution: number, //
        co2Emissions: number //
    }
}

export type CommonCountryDetails = {
    code: string,
    latitude: number,
    longitude: number,
    name: string,
    names: { [code: string]: string },
    flags: string[], // For worldle
    continent: string[],
    borders: string[], // Country codes
    autoUpdateBorders: true,
    links: {
        type: 'GoogleMaps' | 'Wikipedia',
        url: string, // Includes ${cc}
        languageCode: "en"
    }[],
    currencyData: {
        code: string,
        name: string,
        nameChoices: string[], // For worldle
    },
    population: number,
    size: number,
    languageData: {
        languageSources: { title: string, url: string }[],
        languages: { languageCode: string, percentage: number }[]
    },
    productData: {
        year: number,
        totalValue: number,
        topExports: {
            productCode: string, // numerical ID
            value: number
        }[]
    },
    borderMode: "bordering",
    images: { imageCode: number, sourceLink: number }[],
    difficulty: 'easy' | 'hard'
}

export async function fetchCountries(): Promise<CountryInfo[]> {
    const res = await fetch('https://cdn-assets.teuteuf.fr/data/common/countries.json');
    return res.json();
}

export async function fetchGeogridData(code: string): Promise<GeogridCountryDetails> {
    const res = await fetch(`https://cdn-assets.teuteuf.fr/data/geogrid/countries/${code.toLowerCase()}.json`);
    return res.json();
}

export async function fetchCommonData(code: string): Promise<CommonCountryDetails> {
    const res = await fetch(`https://cdn-assets.teuteuf.fr/data/common/countries/${code.toLowerCase()}.json`);
    return res.json();
}

export function getFlagUrl(code: string) {
    return `https://cdn-assets.teuteuf.fr/data/common/flags/${code.toLowerCase()}.svg`;
}
