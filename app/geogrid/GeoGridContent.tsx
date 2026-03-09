'use client'

import { useEffect, useRef, useState, useTransition } from 'react';

// Components
import CenteredModal from '@/components/CenteredModal';
import Spinner from '@/components/Spinner';

// Utils
import {
    CommonCountryDetails,
    CountryInfo,
    fetchCommonData,
    fetchCountries,
    fetchGeogridData, GeogridCountryDetails,
    getFlagUrl
} from '@/app/geogrid/api';

// Icons
import { FaArrowUp, FaArrowDown, FaArrowsUpDown } from 'react-icons/fa6';


export default function GeoGridContent() {
    const countryRef = useRef<CountryInfo[] | null>(null);
    const geogridDataRef = useRef<{ [code: string]: GeogridCountryDetails }>({});
    const commonDataRef = useRef<{ [code: string]: CommonCountryDetails }>({});

    const [sorted, setSorted] = useState<CountryInfo[] | null>(null);
    const [pending, startTransition] = useTransition();

    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortConfig>({ column: null, direction: 'asc' });

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

            setSorted(countries);
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
        setSort(prev => ({
            column,
            direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }

    const sorted = useMemo(() => {
        if (!filtered || !sort.column) return filtered;

        return [...filtered].sort((a, b) => {
            const getVal = (c: CountryInfo) => {
                const geo = geogridDataRef.current[c.code];
                const common = commonDataRef.current[c.code];
                switch (sort.column) {
                    case 'name': return c.name;
                    case 'population': return common?.population;
                    case 'size': return common?.size;
                    case 'borders': return geo?.geographyInfo.borderCountOverride ?? (geo?.geographyInfo.islandNation ? 0 : common?.borders.length);
                    case 'hdi': return geo?.economicInfo.HDI;
                    case 'cpi': return geo?.politicalInfo.CPI;
                    case 'gdp': return geo?.economicInfo.GDPPerCapita;
                    case 'coastline': return geo?.geographyInfo.coastlineLength;
                    case 'airPollution': return geo?.factsInfo.airPollution;
                    case 'co2': return geo?.factsInfo.co2Emissions;
                    case 'olympicMedals': return geo?.sportsInfo.olympicMedals;
                    default: return null;
                }
            };

            const aVal = getVal(a);
            const bVal = getVal(b);

            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const cmp = typeof aVal === 'string' && typeof bVal === 'string'
                ? aVal.localeCompare(bVal)
                : (aVal as number) - (bVal as number);

            return sort.direction === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sort]);

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
                    <SortableColumnHeader label="Name / code" column="name" sort={sort} onSort={toggleSort} className="ml-17.5 w-36" />
                    <SortableColumnHeader label="Population" column="population" sort={sort} onSort={toggleSort} className="w-24" />
                    <SortableColumnHeader label="Size" column="size" sort={sort} onSort={toggleSort} className="w-28" />
                    <SortableColumnHeader label="Borders" column="borders" sort={sort} onSort={toggleSort} className="w-28" />
                    <SortableColumnHeader label="HDI" column="hdi" sort={sort} onSort={toggleSort} className="w-12" />
                    <SortableColumnHeader label="CPI" column="cpi" sort={sort} onSort={toggleSort} className="w-12" />
                    <SortableColumnHeader label="GDP / capita" column="gdp" sort={sort} onSort={toggleSort} className="w-16" />
                    <SortableColumnHeader label="Coastline length" column="coastline" sort={sort} onSort={toggleSort} className="w-20" />
                    <SortableColumnHeader label="Air pollution" column="airPollution" sort={sort} onSort={toggleSort} className="w-24" />
                    <SortableColumnHeader label="CO₂ emissions / capita" column="co2" sort={sort} onSort={toggleSort} className="w-24" />
                    <SortableColumnHeader label="Olympic medals" column="olympicMedals" sort={sort} onSort={toggleSort} className="w-14" />
                    <div className="px-1.5 w-14 flex-none mr-3">
                        Continent(s)
                    </div>
                    <div className="px-1.5 w-20 flex-none mr-3">
                        River systems
                    </div>
                    <div className="px-1.5 w-20 flex-none mr-3">
                        Official lang(s)
                    </div>
                    <GridBooleanLabel label="Landlocked" />
                    <GridBooleanLabel label="Island nation" />
                    <GridBooleanLabel label="Monarchy" />
                    <GridBooleanLabel label="EU" />
                    <GridBooleanLabel label="Cmlth." />
                    <GridBooleanLabel label="USSR" />
                    <GridBooleanLabel label="Nuc. power" />
                    <GridBooleanLabel label="Nuc. weapons" />
                    <GridBooleanLabel label="DST" />
                    <GridBooleanLabel label="SSM legal" />
                    <GridBooleanLabel label="SSA illegal" />
                    <GridBooleanLabel label="Drives left" />
                    <GridBooleanLabel label="Alc. ban" />
                    <GridBooleanLabel label="Touches Sahara" />
                    <GridBooleanLabel label="Touches equator" />
                    <GridBooleanLabel label="Touches Eur. steppe" />
                    <GridBooleanLabel label="Hosted F1" />
                    <GridBooleanLabel label="Hosted olympics" />
                    <GridBooleanLabel label="Hosted MWC" />
                    <GridBooleanLabel label="Played MWC" />
                    <GridBooleanLabel label="Won MWC" />
                    <GridBooleanLabel label="T20 WHS" />
                    <GridBooleanLabel label="T20 tourism" />
                    <GridBooleanLabel label="T20 rail" />
                    <GridBooleanLabel label="T20 pop. density" />
                    <GridBooleanLabel label="B20 pop. density" />
                    <GridBooleanLabel label="T20 wheat" />
                    <GridBooleanLabel label="T20 oil" />
                    <GridBooleanLabel label="T20 ren. energy" />
                    <GridBooleanLabel label="T10 lakes" />
                    <GridBooleanLabel label="50 skyscrapers" />
                    <GridBooleanLabel label="T20 obesity" />
                    <GridBooleanLabel label="T20 alcohol" />
                    <GridBooleanLabel label="T20 choc." />
                </div>

                {!sorted ? (
                    <div className="w-screen h-full flex items-center justify-center sticky left-0">
                        <Spinner />
                    </div>
                ) : (
                    <div className={'grow w-max bg-black/25 flex flex-col overflow-y-auto divide-y divide-tertiary transition duration-200' + (pending ? ' opacity-50' : '')}>
                        {sorted.map((c) => {
                            const geogridDetails = geogridDataRef.current[c.code];
                            const commonDetails = commonDataRef.current[c.code];

                            return (
                                <div
                                    className="flex text-sm items-center hover:bg-tertiary/30"
                                    key={c.code}
                                >
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
                                        className="w-14"
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
    sort: SortConfig,
    onSort: (col: string) => void,
    className?: string
}
function SortableColumnHeader({ label, column, sort, onSort, className }: SortableColumnHeaderProps) {
    const active = sort.column === column;
    return (
        <button
            className={`${className ?? ''} self-stretch flex-none px-1.5 box-content text-left flex items-center gap-0.5 hover:text-white hover:bg-white/5 transition duration-150 cursor-pointer` + (active ? ' text-white' : '')}
            onClick={() => onSort(column)}
        >
            <span>{label}</span>

            <span className={'ml-auto' + (active ? '' : ' opacity-50')}>
                {!active ? (
                    <FaArrowsUpDown />
                ) : sort.direction === 'asc' ? (
                    <FaArrowUp />
                ) : (
                    <FaArrowDown />
                )}
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

type GridBooleanLabelProps = {
    label: string
}
function GridBooleanLabel(props: GridBooleanLabelProps) {
    return (
        <div className="w-14 flex-none text-center">
            {props.label}
        </div>
    )
}

// https://stackoverflow.com/a/2901298
function withCommas(x: number) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}
