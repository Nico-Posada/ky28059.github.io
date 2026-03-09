'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import CenteredModal from '@/components/CenteredModal';
import Spinner from '@/components/Spinner';


export default function GeoGridContent() {
    const countryRef = useRef<CountryInfo[] | null>(null);
    const geogridDataRef = useRef<{ [code: string]: GeogridCountryDetails }>({});
    const commonDataRef = useRef<{ [code: string]: CommonCountryDetails }>({});

    const [filtered, setFiltered] = useState<CountryInfo[] | null>(null);
    const [pending, startTransition] = useTransition();

    const [query, setQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: 'asc' });

    // The ID of the country for which we are displaying the border modal
    const [selectedBorders, setSelectedBorders] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            const countries = await fetchCountries();
            countryRef.current = countries;

            // Fetch all geogrid / common country details in parallel
            const [geogrid, common] = await Promise.all([
                Promise.all(countries.map(c => fetchGeogridData(c.code))),
                Promise.all(countries.map(c => fetchCommonData(c.code)))
            ]);
            geogridDataRef.current = Object.fromEntries(geogrid.map((d, i) => [countries[i].code, d]));
            commonDataRef.current = Object.fromEntries(common.map((d, i) => [countries[i].code, d]));

            setFiltered(countries);
        }

        void fetchData();
    }, []);

    function updateQuery(query: string) {
        setQuery(query);
        startTransition(() => {
            if (!countryRef.current) return;
            setFiltered(countryRef.current.filter(c => c.name.toLowerCase().includes(query.toLowerCase())));
        })
    }

    function toggleSort(column: string) {
        setSortConfig(prev => ({
            column,
            direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }

    const sortedFiltered = useMemo(() => {
        if (!filtered || !sortConfig.column) return filtered;

        return [...filtered].sort((a, b) => {
            const getVal = (c: CountryInfo): number | string | boolean | null | undefined => {
                const geo = geogridDataRef.current[c.code];
                const common = commonDataRef.current[c.code];
                switch (sortConfig.column) {
                    case 'name': return c.name;
                    case 'population': return common?.population;
                    case 'size': return common?.size;
                    case 'borders': return geo?.geographyInfo.borderCountOverride ?? common?.borders.length;
                    case 'hdi': return geo?.economicInfo.HDI;
                    case 'cpi': return geo?.politicalInfo.CPI;
                    case 'gdp': return geo?.economicInfo.GDPPerCapita;
                    case 'coastline': return geo?.geographyInfo.coastlineLength;
                    case 'airPollution': return geo?.factsInfo.airPollution;
                    case 'co2': return geo?.factsInfo.co2Emissions;
                    case 'olympicMedals': return geo?.sportsInfo.olympicMedals;
                    case 'rivers': return geo?.geographyInfo.rivers?.join(', ') ?? '';
                    case 'landlocked': return geo?.geographyInfo.landlocked;
                    case 'islandNation': return geo?.geographyInfo.islandNation;
                    case 'monarchy': return geo?.politicalInfo.isMonarchy;
                    case 'eu': return geo?.politicalInfo.inEU;
                    case 'commonwealth': return geo?.politicalInfo.inCommonwealth;
                    case 'ussr': return geo?.politicalInfo.wasUSSR;
                    case 'nuclearPower': return geo?.economicInfo.producesNuclearPower;
                    case 'nuclearWeapons': return geo?.politicalInfo.hasNuclearWeapons;
                    case 'dst': return geo?.politicalInfo.observesDST;
                    case 'ssmLegal': return geo?.politicalInfo.sameSexMarriageLegal;
                    case 'ssaIllegal': return geo?.politicalInfo.sameSexActivitiesIllegal;
                    case 'drivesLeft': return geo?.factsInfo.drivesLeft;
                    case 'alcoholBan': return geo?.factsInfo.hasAlcoholBan;
                    case 'touchesSahara': return geo?.geographyInfo.touchesSahara;
                    case 'touchesEquator': return geo?.geographyInfo.touchesEquator;
                    case 'touchesSteppe': return geo?.geographyInfo.touchesEurasionSteppe;
                    case 'hostedF1': return geo?.sportsInfo.hostedF1;
                    case 'hostedOlympics': return geo?.sportsInfo.hostedOlympics;
                    case 'hostedMWC': return geo?.sportsInfo.hostedMensWorldCup;
                    case 'playedMWC': return geo?.sportsInfo.playedMensWorldCup;
                    case 'wonMWC': return geo?.sportsInfo.wonMensWorldCup;
                    case 't20WHS': return geo?.factsInfo.top20WorldHeritageSites;
                    case 't20Tourism': return geo?.factsInfo.top20TourismRate;
                    case 't20Rail': return geo?.factsInfo.top20RailSize;
                    case 't20PopDensity': return geo?.factsInfo.top20PopulationDensity;
                    case 'b20PopDensity': return geo?.factsInfo.bottom20PopulationDensity;
                    case 't20Wheat': return geo?.economicInfo.top20WheatProduction;
                    case 't20Oil': return geo?.economicInfo.top20OilProduction;
                    case 't20Renewable': return geo?.economicInfo.top20RenewableElectricityProduction;
                    case 't10Lakes': return geo?.geographyInfo.top10Lakes;
                    case '50Skyscrapers': return geo?.factsInfo.has50Skyscrapers;
                    case 't20Obesity': return geo?.factsInfo.top20ObesityRate;
                    case 't20Alcohol': return geo?.factsInfo.top20AlcoholConsumption;
                    case 't20Chocolate': return geo?.factsInfo.top20ChocolateConsumption;
                    default: return null;
                }
            };

            const aVal = getVal(a);
            const bVal = getVal(b);

            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // Boolean sorting: true before false, ties broken by country name
            if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
                if (aVal !== bVal) {
                    const cmp = aVal ? -1 : 1;
                    return sortConfig.direction === 'asc' ? cmp : -cmp;
                }
                return a.name.localeCompare(b.name);
            }

            const cmp = typeof aVal === 'string' && typeof bVal === 'string'
                ? aVal.localeCompare(bVal)
                : (aVal as number) - (bVal as number);

            return sortConfig.direction === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortConfig]);

    return (
        <>
            <div className="container mb-6">
                <input
                    className="disabled:opacity-50 transition duration-200 rounded px-3.5 py-1.5 text-sm border border-tertiary focus:outline-none focus:ring-2"
                    value={query}
                    onChange={(e) => updateQuery(e.target.value)}
                    disabled={!filtered}
                    placeholder="Filter by country"
                />
            </div>

            <div className="grow overflow-x-auto flex flex-col">
                <div className="w-max border-b border-tertiary flex text-xs text-primary items-center break-words">
                    <div className="w-8 flex-none text-center">#</div>
                    <div className="ml-19 w-36 flex-none mr-3">
                        <SortableColumnHeader label="Name / code" column="name" sortConfig={sortConfig} onSort={toggleSort} />
                    </div>

                    <SortableColumnHeader label="Population" column="population" sortConfig={sortConfig} onSort={toggleSort} className="w-24" />
                    <SortableColumnHeader label="Size" column="size" sortConfig={sortConfig} onSort={toggleSort} className="w-28" />
                    <SortableColumnHeader label="Borders" column="borders" sortConfig={sortConfig} onSort={toggleSort} className="w-28" />
                    <SortableColumnHeader label="HDI" column="hdi" sortConfig={sortConfig} onSort={toggleSort} className="w-12" />
                    <SortableColumnHeader label="CPI" column="cpi" sortConfig={sortConfig} onSort={toggleSort} className="w-12" />
                    <SortableColumnHeader label="GDP / capita" column="gdp" sortConfig={sortConfig} onSort={toggleSort} className="w-16" />
                    <SortableColumnHeader label="Coastline length" column="coastline" sortConfig={sortConfig} onSort={toggleSort} className="w-20" />
                    <SortableColumnHeader label="Air pollution" column="airPollution" sortConfig={sortConfig} onSort={toggleSort} className="w-24" />
                    <SortableColumnHeader label="CO₂ emissions / capita" column="co2" sortConfig={sortConfig} onSort={toggleSort} className="w-24" />
                    <SortableColumnHeader label="Olympic medals" column="olympicMedals" sortConfig={sortConfig} onSort={toggleSort} className="w-12" />
                    <div className="w-14 flex-none mr-3">
                        Continent(s)
                    </div>
                    <SortableColumnHeader label="River systems" column="rivers" sortConfig={sortConfig} onSort={toggleSort} className="w-20 text-xs" />
                    <div className="w-20 flex-none mr-3">
                        Official lang(s)
                    </div>
                    <SortableBooleanLabel label="Landlocked" column="landlocked" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Island nation" column="islandNation" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Monarchy" column="monarchy" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="EU" column="eu" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Cmlth." column="commonwealth" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="USSR" column="ussr" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Nuc. power" column="nuclearPower" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Nuc. weapons" column="nuclearWeapons" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="DST" column="dst" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="SSM legal" column="ssmLegal" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="SSA illegal" column="ssaIllegal" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Drives left" column="drivesLeft" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Alc. ban" column="alcoholBan" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Touches Sahara" column="touchesSahara" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Touches equator" column="touchesEquator" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Touches Eur. steppe" column="touchesSteppe" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Hosted F1" column="hostedF1" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Hosted olympics" column="hostedOlympics" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Hosted MWC" column="hostedMWC" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Played MWC" column="playedMWC" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="Won MWC" column="wonMWC" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 WHS" column="t20WHS" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 tourism" column="t20Tourism" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 rail" column="t20Rail" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 pop. density" column="t20PopDensity" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="B20 pop. density" column="b20PopDensity" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 wheat" column="t20Wheat" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 oil" column="t20Oil" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 ren. energy" column="t20Renewable" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T10 lakes" column="t10Lakes" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="50 skyscrapers" column="50Skyscrapers" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 obesity" column="t20Obesity" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 alcohol" column="t20Alcohol" sortConfig={sortConfig} onSort={toggleSort} />
                    <SortableBooleanLabel label="T20 choc." column="t20Chocolate" sortConfig={sortConfig} onSort={toggleSort} />
                </div>

                {!filtered ? (
                    <div className="w-screen h-full flex items-center justify-center sticky left-0">
                        <Spinner />
                    </div>
                ) : (
                    <div className={'grow w-max bg-black/25 flex flex-col overflow-y-auto divide-y divide-tertiary transition duration-200' + (pending ? ' opacity-50' : '')}>
                        {sortedFiltered!.map((c, i) => {
                            const geogridDetails = geogridDataRef.current[c.code];
                            const commonDetails = commonDataRef.current[c.code];

                            return (
                                <div
                                    className="flex text-sm items-center hover:bg-tertiary/30"
                                    key={c.code}
                                >
                                    <div className="w-8 flex-none text-center text-xs text-secondary">
                                        {i + 1}
                                    </div>
                                    <img
                                        className="max-h-12 w-16 flex-none object-contain object-right py-0.5 mr-3"
                                        src={getFlagUrl(c.code)}
                                        alt={c.name}
                                    />
                                    <div className="w-36 flex-none mr-3 text-pretty">
                                        {c.name} <span className="text-secondary">({c.code})</span>
                                    </div>
                                    <GridCell
                                        className="w-24"
                                        value={commonDetails?.population}
                                    />
                                    <GridCell
                                        className="w-28"
                                        value={commonDetails?.size}
                                        unit="km²"
                                    />
                                    {(geogridDetails?.geographyInfo.borderCountOverride !== undefined || geogridDetails?.geographyInfo.islandNation) ? (
                                        <GridCell
                                            className="w-28"
                                            value={geogridDetails?.geographyInfo.borderCountOverride ?? 0}
                                        />
                                    ) : (
                                        <button
                                            className="w-28 text-sm mr-3 flex-none bg-white/10 hover:bg-white/15 transition duration-150 rounded-full px-2.5 py-1 text-left my-0.5"
                                            onClick={() => setSelectedBorders(c.code)}
                                        >
                                            {commonDetails.borders.length}{' '}
                                            <span className="text-secondary text-xs">(view all)</span>
                                        </button>
                                    )}
                                    <GridCell
                                        className="w-12"
                                        value={geogridDetails?.economicInfo.HDI}
                                    />
                                    <GridCell
                                        className="w-12"
                                        value={geogridDetails?.politicalInfo.CPI}
                                    />
                                    <GridCell
                                        className="w-16"
                                        value={geogridDetails?.economicInfo.GDPPerCapita}
                                        prefix="$"
                                    />
                                    <GridCell
                                        className="w-20"
                                        value={geogridDetails?.geographyInfo.coastlineLength}
                                        unit="km"
                                    />
                                    <GridCell
                                        className="w-24"
                                        value={geogridDetails?.factsInfo.airPollution}
                                        unit="μg/m³"
                                    />
                                    <GridCell
                                        className="w-24"
                                        value={geogridDetails?.factsInfo.co2Emissions}
                                        unit="tCO₂/y"
                                    />
                                    <GridCell
                                        className="w-12"
                                        value={geogridDetails?.sportsInfo.olympicMedals}
                                    />
                                    <GridArrayCell
                                        className="w-14 text-xs"
                                        value={commonDetails?.continent}
                                    />
                                    <GridArrayCell
                                        className="w-20 text-xs"
                                        value={geogridDetails?.geographyInfo.rivers}
                                    />
                                    <GridArrayCell
                                        className="w-20 text-xs"
                                        value={geogridDetails?.politicalInfo.officialLanguageCodes}
                                    />
                                    <GridBooleanCell value={geogridDetails?.geographyInfo.landlocked} />
                                    <GridBooleanCell value={geogridDetails?.geographyInfo.islandNation} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.isMonarchy} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.inEU} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.inCommonwealth} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.wasUSSR} />
                                    <GridBooleanCell value={geogridDetails?.economicInfo.producesNuclearPower} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.hasNuclearWeapons} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.observesDST} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.sameSexMarriageLegal} />
                                    <GridBooleanCell value={geogridDetails?.politicalInfo.sameSexActivitiesIllegal} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.drivesLeft} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.hasAlcoholBan} />
                                    <GridBooleanCell value={geogridDetails?.geographyInfo.touchesSahara} />
                                    <GridBooleanCell value={geogridDetails?.geographyInfo.touchesEquator} />
                                    <GridBooleanCell value={geogridDetails?.geographyInfo.touchesEurasionSteppe} />
                                    <GridBooleanCell value={geogridDetails?.sportsInfo.hostedF1} />
                                    <GridBooleanCell value={geogridDetails?.sportsInfo.hostedOlympics} />
                                    <GridBooleanCell value={geogridDetails?.sportsInfo.hostedMensWorldCup} />
                                    <GridBooleanCell value={geogridDetails?.sportsInfo.playedMensWorldCup} />
                                    <GridBooleanCell value={geogridDetails?.sportsInfo.wonMensWorldCup} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.top20WorldHeritageSites} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.top20TourismRate} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.top20RailSize} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.top20PopulationDensity} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.bottom20PopulationDensity} />
                                    <GridBooleanCell value={geogridDetails?.economicInfo.top20WheatProduction} />
                                    <GridBooleanCell value={geogridDetails?.economicInfo.top20OilProduction} />
                                    <GridBooleanCell value={geogridDetails?.economicInfo.top20RenewableElectricityProduction} />
                                    <GridBooleanCell value={geogridDetails?.geographyInfo.top10Lakes} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.has50Skyscrapers} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.top20ObesityRate} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.top20AlcoholConsumption} />
                                    <GridBooleanCell value={geogridDetails?.factsInfo.top20ChocolateConsumption} />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <CenteredModal
                isOpen={selectedBorders !== null}
                onClose={() => setSelectedBorders(null)}
                className="relative w-full max-w-xl bg-midnight rounded-md overflow-clip pt-6"
            >
                {selectedBorders !== null && (
                    <>
                        <h1 className="text-xl font-semibold px-8 mb-3">
                            Borders of {commonDataRef.current[selectedBorders].name}
                        </h1>

                        <div className="flex flex-col divide-y divide-tertiary">
                            {[...new Set(commonDataRef.current[selectedBorders].borders)].map((code) => (
                                <div className="flex items-center gap-3.5" key={code}>
                                    <img
                                        src={getFlagUrl(code)}
                                        className="w-14 max-h-12 object-contain object-right"
                                    />
                                    <p className="py-1.5 text-sm">
                                        {commonDataRef.current[code.toUpperCase()]?.name}{' '}
                                        <span className="text-secondary">({code.toUpperCase()})</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CenteredModal>
        </>
    )
}

type SortConfig = {
    column: string | null,
    direction: 'asc' | 'desc'
}

type SortableColumnHeaderProps = {
    label: string,
    column: string,
    sortConfig: SortConfig,
    onSort: (col: string) => void,
    className?: string
}
function SortableColumnHeader({ label, column, sortConfig, onSort, className }: SortableColumnHeaderProps) {
    const isActive = sortConfig.column === column;
    return (
        <button
            className={`${className ?? ''} flex-none mr-3 text-left flex items-center gap-0.5 hover:text-white transition duration-150 cursor-pointer`}
            onClick={() => onSort(column)}
        >
            <span>{label}</span>
            <span className={'text-secondary ' + (isActive ? 'text-white' : '')}>
                {isActive ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
            </span>
        </button>
    )
}

type GridCellProps = {
    value: string | number | null | undefined,
    prefix?: string,
    unit?: string,
    className: string
}
function GridCell(props: GridCellProps) {
    if (props.value === undefined || props.value === null) return (
        <div className={`${props.className} text-secondary mr-3 flex-none`}>
            —
        </div>
    )

    return (
        <div className={`${props.className} mr-3 flex-none`}>
            {props.prefix}
            {typeof props.value === 'number' ? withCommas(props.value) : props.value}
            {props.unit && (
                <span className="text-secondary ml-1">{props.unit}</span>
            )}
        </div>
    )
}

type GridBooleanCellProps = {
    value: boolean | null | undefined
}
function GridBooleanCell(props: GridBooleanCellProps) {
    if (props.value === undefined || props.value === null) return (
        <div className="w-14 flex-none text-secondary">
            —
        </div>
    )

    return (
        <div className={'w-14 flex-none self-stretch flex items-center justify-center ' + (props.value ? 'bg-lime-500/30' : 'bg-red-500/25')}>
            <input
                disabled
                readOnly
                type="checkbox"
                checked={props.value}
            />
        </div>
    )
}

type GridArrayCellProps = {
    value: string[] | undefined,
    className: string
}
function GridArrayCell(props: GridArrayCellProps) {
    if (!props.value || props.value.length === 0) return (
        <div className={`${props.className} text-secondary mr-3 flex-none`}>
            —
        </div>
    )

    return (
        <div className={`${props.className} text-xs mr-3 flex-none`}>
            {props.value.join(', ')}
        </div>
    )
}

type SortableBooleanLabelProps = {
    label: string,
    column: string,
    sortConfig: SortConfig,
    onSort: (col: string) => void
}
function SortableBooleanLabel({ label, column, sortConfig, onSort }: SortableBooleanLabelProps) {
    const isActive = sortConfig.column === column;
    return (
        <button
            className="w-14 flex-none text-center cursor-pointer hover:text-white transition duration-150"
            onClick={() => onSort(column)}
            title={label}
        >
            {label}
            <span className={'text-secondary ' + (isActive ? 'text-white' : '')}>
                {isActive ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
            </span>
        </button>
    )
}

type CountryInfo = {
    code: string,
    name: string,
    longitude: number,
    latitude: number,
    names: { [lang: string]: string }
}

type GeogridCountryDetails = {
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

type CommonCountryDetails = {
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

async function fetchCountries(): Promise<CountryInfo[]> {
    const res = await fetch('https://cdn-assets.teuteuf.fr/data/common/countries.json');
    return res.json();
}

async function fetchGeogridData(code: string): Promise<GeogridCountryDetails> {
    const res = await fetch(`https://cdn-assets.teuteuf.fr/data/geogrid/countries/${code.toLowerCase()}.json`);
    return res.json();
}

async function fetchCommonData(code: string): Promise<CommonCountryDetails> {
    const res = await fetch(`https://cdn-assets.teuteuf.fr/data/common/countries/${code.toLowerCase()}.json`);
    return res.json();
}

function getFlagUrl(code: string) {
    return `https://cdn-assets.teuteuf.fr/data/common/flags/${code.toLowerCase()}.svg`;
}

// https://stackoverflow.com/a/2901298
function withCommas(x: number) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}
