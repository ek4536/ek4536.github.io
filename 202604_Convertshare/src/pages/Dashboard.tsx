import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, ExternalLink, Building2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PropertyInfo {
  block: string;
  lot: string;
  borough: string;
  boroughCode: string;
  bin: string;
  zoneDist1: string;
  zoneDist2: string;
  bldgClass: string;
  landUse: string;
  ownerName: string;
  numFloors: string;
  yearBuilt: string;
  lotArea: string;
  bldgArea: string;
  unitsRes: string;
  unitsTotal: string;
  builtFar: string;
  residFar: string;
  commFar: string;
  latitude: string;
  longitude: string;
  loading: boolean;
  error: string | null;
}

interface PermitRecord {
  year: string;
  description: string;
  type: "permit" | "violation";
  status: string;
  date: string;
}

const LAND_USE_LABELS: Record<string, string> = {
  "1": "One & Two Family",
  "2": "Multi-Family Walk-Up",
  "3": "Multi-Family Elevator",
  "4": "Mixed Residential & Commercial",
  "5": "Commercial & Office",
  "6": "Industrial & Manufacturing",
  "7": "Transportation & Utility",
  "8": "Public Facilities & Institutions",
  "9": "Open Space & Outdoor Recreation",
  "10": "Parking Facilities",
  "11": "Vacant Land",
};

const BOROUGH_NAMES: Record<string, string> = {
  "1": "Manhattan",
  "2": "Bronx",
  "3": "Brooklyn",
  "4": "Queens",
  "5": "Staten Island",
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm border">
    <p className="text-xs uppercase tracking-wide" style={{ color: '#303870', opacity: 0.7 }}>{label}</p>
    <p className="text-base font-semibold mt-1 break-words" style={{ color: '#303870' }}>{value || "—"}</p>
  </div>
);

// Zoning districts that generally allow residential use
const RESIDENTIAL_ZONES = ["R", "C1", "C2", "C3", "C4", "C5", "C6", "M1"];
const OFFICE_LAND_USES = ["5"]; // Commercial & Office
const OFFICE_BLDG_CLASSES = ["O", "L", "K"]; // Office building classes

const checkZoningAllowsResidential = (zone: string): boolean => {
  if (!zone) return false;
  const upper = zone.toUpperCase();
  return RESIDENTIAL_ZONES.some((rz) => upper.startsWith(rz));
};

const getEligibility = (property: PropertyInfo): boolean => {
  const yearBuilt = parseInt(property.yearBuilt) || 0;
  const builtFar = parseFloat(property.builtFar) || 0;
  const landUse = property.landUse;
  const bldgClassPrefix = property.bldgClass ? property.bldgClass[0].toUpperCase() : "";
  const zoning = property.zoneDist1;
  const isOfficeUse = OFFICE_LAND_USES.includes(landUse);
  const isOfficeBldgClass = OFFICE_BLDG_CLASSES.includes(bldgClassPrefix);
  const isNonResidential = isOfficeUse || isOfficeBldgClass;
  const zoningAllowsRes = checkZoningAllowsResidential(zoning);
  const builtBefore1991 = yearBuilt > 0 && yearBuilt < 1991;
  const farExceeds12 = builtFar > 12;
  const farEligible = !farExceeds12 || (farExceeds12 && yearBuilt < 1968);
  const isHotel = bldgClassPrefix === "H";
  return isNonResidential && !isHotel && zoningAllowsRes && builtBefore1991 && farEligible;
};

const EligibilityChecklist = ({ property }: { property: PropertyInfo }) => {
  const yearBuilt = parseInt(property.yearBuilt) || 0;
  const builtFar = parseFloat(property.builtFar) || 0;
  const landUse = property.landUse;
  const bldgClassPrefix = property.bldgClass ? property.bldgClass[0].toUpperCase() : "";
  const borough = property.boroughCode;
  const zoning = property.zoneDist1;

  // 1. Non-residential building (must be office/commercial, not hotel or residential)
  const isOfficeUse = OFFICE_LAND_USES.includes(landUse);
  const isOfficeBldgClass = OFFICE_BLDG_CLASSES.includes(bldgClassPrefix);
  const isNonResidential = isOfficeUse || isOfficeBldgClass;

  // 2. Zoning allows residential use
  const zoningAllowsRes = checkZoningAllowsResidential(zoning);

  // 3. City of Yes: built before 1991
  const builtBefore1991 = yearBuilt > 0 && yearBuilt < 1991;

  // 4. FAR check: if FAR > 12, must be built before 1968
  const farExceeds12 = builtFar > 12;
  const farEligible = !farExceeds12 || (farExceeds12 && yearBuilt < 1968);

  // 5. Not a hotel (building class starting with H)
  const isHotel = bldgClassPrefix === "H";

  // 6. Manhattan south of 96th St = MPDA (deeper tax benefits)
  const lat = parseFloat(property.latitude) || 0;
  const isMPDA = borough === "1" && lat > 0 && lat < 40.7856; // ~96th St latitude

  // 7. Lower Manhattan (Financial District / Tribeca) — most proven conversion area
  const isLowerManhattan = borough === "1" && lat > 0 && lat < 40.7145;

  const isEligible = (() => {
    const c = [isNonResidential, !isHotel, zoningAllowsRes, builtBefore1991, farEligible];
    return c.every(Boolean);
  })();

  const checks: { pass: boolean; label: string }[] = [
    {
      pass: isNonResidential,
      label: isNonResidential
        ? `Non-residential building (Land Use: ${LAND_USE_LABELS[landUse] || landUse}, Class: ${property.bldgClass})`
        : `Building must be non-residential for conversion (current Land Use: ${LAND_USE_LABELS[landUse] || landUse || "unknown"})`,
    },
    {
      pass: !isHotel,
      label: isHotel
        ? "Hotels are excluded from 467-m eligibility"
        : "Not a hotel (hotels are excluded from 467-m)",
    },
    {
      pass: zoningAllowsRes,
      label: zoningAllowsRes
        ? `Zoning (${zoning}) allows residential use`
        : `Zoning (${zoning || "unknown"}) may not allow residential use`,
    },
    {
      pass: builtBefore1991,
      label: builtBefore1991
        ? `Built in ${property.yearBuilt} (before 1991 — meets City of Yes threshold)`
        : yearBuilt >= 1991
          ? `Built in ${property.yearBuilt} (after 1990 — does not meet City of Yes conversion threshold)`
          : "Year built unknown — cannot verify City of Yes eligibility",
    },
    {
      pass: farEligible,
      label: farExceeds12
        ? farEligible
          ? `FAR is ${builtFar.toFixed(1)} (exceeds 12, but built before 1968 — eligible with income-restricted units)`
          : `FAR is ${builtFar.toFixed(1)} (exceeds 12 and built after 1967 — may face Multiple Dwelling Law cap)`
        : `FAR is ${builtFar.toFixed(1)} (does not exceed 12 — no MDL cap issue)`,
    },
  ];

  // Info items (not pass/fail)
  const infoItems: string[] = [];
  if (isMPDA) {
    infoItems.push("📍 Located in Manhattan Prime Development Area (MPDA) — eligible for deeper 467-m tax exemptions (90% during full benefit period)");
  }
  if (isLowerManhattan) {
    infoItems.push("📍 Located in Lower Manhattan — area with strongest conversion track record and market feasibility");
  }
  if (!isMPDA && borough === "1") {
    infoItems.push("📍 Located in Manhattan north of 96th St — eligible for standard 467-m exemptions (65% during full benefit period)");
  }
  if (borough !== "1") {
    infoItems.push("📍 Located outside Manhattan — eligible for standard 467-m exemptions (65% during full benefit period)");
  }

  const passCount = checks.filter((c) => c.pass).length;
  const totalChecks = checks.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-semibold">
          {passCount === totalChecks ? "✅" : passCount >= 3 ? "⚠️" : "❌"}
        </span>
        <span className="font-semibold text-2xl" style={{ color: '#303870' }}>
          {passCount === totalChecks
            ? "Property appears eligible for office-to-residential conversion"
            : passCount >= 3
              ? "Property may be partially eligible — review items below"
              : "Property does not appear eligible for conversion"}
        </span>
      </div>
      <ul className="space-y-2 text-sm">
        {checks.map((check, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5">{check.pass ? "✅" : "❌"}</span>
            <span style={{ color: '#303870' }}>{check.label}</span>
          </li>
        ))}
      </ul>
      {infoItems.length > 0 && (
        <ul className="space-y-2 text-sm mt-3 border-t pt-3">
          {infoItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2" style={{ color: '#303870' }}>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs mt-4 border-t pt-3" style={{ color: '#303870', opacity: 0.7 }}>
        Note: This is a preliminary screening only. 467-m eligibility also requires 25% income-restricted units (avg 80% AMI), at least 50% of completed area from pre-existing building, and compliance with HPD rules. Consult with a zoning attorney for a definitive assessment.
      </p>
    </div>
  );
};

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const address = searchParams.get("address") || "";
  const [property, setProperty] = useState<PropertyInfo>({
    block: "", lot: "", borough: "", boroughCode: "", bin: "",
    zoneDist1: "", zoneDist2: "", bldgClass: "", landUse: "",
    ownerName: "", numFloors: "", yearBuilt: "", lotArea: "",
    bldgArea: "", unitsRes: "", unitsTotal: "",
    builtFar: "", residFar: "", commFar: "",
    latitude: "", longitude: "",
    loading: true, error: null,
  });
  const [permits, setPermits] = useState<PermitRecord[]>([]);
  const [permitsLoading, setPermitsLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchPropertyInfo = async () => {
      try {
        const geoRes = await fetch(
          `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(address)}`
        );
        const geoData = await geoRes.json();
        const feature = geoData?.features?.[0];
        const pad = feature?.properties?.addendum?.pad;
        const bbl = pad?.bbl;
        const bin = pad?.bin || "";

        if (!bbl || bbl.length !== 10) {
          setProperty((p) => ({ ...p, loading: false, error: "Property not found for this address." }));
          setPermitsLoading(false);
          return;
        }

        const boroughCode = bbl[0];
        const block = bbl.substring(1, 6).replace(/^0+/, "");
        const lot = bbl.substring(6, 10).replace(/^0+/, "");

        const plutoRes = await fetch(
          `https://data.cityofnewyork.us/resource/64uk-42ks.json?$where=bbl='${bbl}'&$limit=1`
        );
        const plutoData = await plutoRes.json();
        const p = plutoData?.[0];

        setProperty({
          block, lot,
          borough: BOROUGH_NAMES[boroughCode] || boroughCode,
          boroughCode, bin,
          zoneDist1: p?.zonedist1 || "",
          zoneDist2: p?.zonedist2 || "",
          bldgClass: p?.bldgclass || "",
          landUse: p?.landuse || "",
          ownerName: p?.ownername || "",
          numFloors: p?.numfloors ? String(Math.round(parseFloat(p.numfloors))) : "",
          yearBuilt: p?.yearbuilt && p.yearbuilt !== "0" ? p.yearbuilt : "",
          lotArea: p?.lotarea ? Number(p.lotarea).toLocaleString() : "",
          bldgArea: p?.bldgarea ? Number(p.bldgarea).toLocaleString() : "",
          unitsRes: p?.unitsres || "",
          unitsTotal: p?.unitstotal || "",
          builtFar: p?.builtfar || "",
          residFar: p?.residfar || "",
          commFar: p?.commfar || "",
          latitude: p?.latitude || "",
          longitude: p?.longitude || "",
          loading: false, error: null,
        });

        // Fetch permits & violations in parallel
        if (bin) {
          fetchPermitHistory(bin);
        } else {
          setPermitsLoading(false);
        }
      } catch {
        setProperty((p) => ({ ...p, loading: false, error: "Failed to fetch property info." }));
        setPermitsLoading(false);
      }
    };

    const fetchPermitHistory = async (bin: string) => {
      try {
        const [bisPermitsRes, dobNowRes, violationsRes] = await Promise.all([
          // DOB BIS Job Filings
          fetch(`https://data.cityofnewyork.us/resource/ic3t-wcy2.json?bin__=${bin}&$limit=50&$order=pre__filing_date DESC`),
          // DOB NOW Permits
          fetch(`https://data.cityofnewyork.us/resource/rbx6-tga4.json?bin=${bin}&$limit=50&$order=filing_date DESC`),
          // DOB Violations
          fetch(`https://data.cityofnewyork.us/resource/3h2n-5cm9.json?bin=${bin}&$limit=50&$order=issue_date DESC`),
        ]);

        const [bisPermits, dobNowPermits, violations] = await Promise.all([
          bisPermitsRes.json(),
          dobNowRes.json(),
          violationsRes.json(),
        ]);

        const records: PermitRecord[] = [];

        // Parse DOB BIS permits
        if (Array.isArray(bisPermits)) {
          for (const p of bisPermits) {
            const date = p.pre__filing_date || p.fully_permitted || "";
            const year = date ? new Date(date).getFullYear().toString() : "N/A";
            const jobType = p.job_type || "";
            const jobDesc = p.job_description || p.building_type || "";
            records.push({
              year,
              description: `[Permit] Job #${p.job__ || "N/A"} — ${jobType}${jobDesc ? `: ${jobDesc}` : ""}`,
              type: "permit",
              status: p.job_status || p.job_status_descrp || "—",
              date,
            });
          }
        }

        // Parse DOB NOW permits
        if (Array.isArray(dobNowPermits)) {
          for (const p of dobNowPermits) {
            const date = p.filing_date || p.issuance_date || "";
            const year = date ? new Date(date).getFullYear().toString() : "N/A";
            const workType = p.work_type || p.job_type || "";
            const desc = p.job_description || "";
            records.push({
              year,
              description: `[Permit] ${p.job_filing_number || "N/A"} — ${workType}${desc ? `: ${desc}` : ""}`,
              type: "permit",
              status: p.filing_status || p.permit_status || "—",
              date,
            });
          }
        }

        // Parse Violations
        if (Array.isArray(violations)) {
          for (const v of violations) {
            const date = v.issue_date || "";
            const year = date ? new Date(date).getFullYear().toString() : "N/A";
            const violType = v.violation_type || "";
            const desc = v.violation_category || v.description || "";
            records.push({
              year,
              description: `[Violation] #${v.violation_number || "N/A"} — ${violType}${desc ? `: ${desc}` : ""}`,
              type: "violation",
              status: v.disposition_comments || v.violation_type_code || v.current_status || "—",
              date,
            });
          }
        }

        // Sort reverse chronological
        records.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setPermits(records);
      } catch (err) {
        console.error("Failed to fetch permit history:", err);
      } finally {
        setPermitsLoading(false);
      }
    };

    fetchPropertyInfo();
  }, [address]);

  const bisUrl = property.boroughCode && property.block && property.lot
    ? `https://a810-bisweb.nyc.gov/bisweb/PropertyProfileOverviewServlet?boro=${property.boroughCode}&block=${property.block.padStart(5, "0")}&lot=${property.lot.padStart(4, "0")}`
    : "";

  return (
    <div className="min-h-screen w-full font-['Oswald',sans-serif]" style={{ backgroundColor: '#F4EDE2', color: '#303870' }}>

      <div className="w-full h-[400px]">
        <iframe
          title="Google Maps"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=17`}
        />
      </div>

      <div className="p-6">
        <h2 className="text-5xl font-semibold mb-4 text-center uppercase" style={{ color: '#303870' }}>{address}</h2>
        <h3 className="text-2xl font-semibold mb-2 text-center uppercase" style={{ color: '#303870' }}>Property Information</h3>
        {bisUrl && (
          <a
            href={bisUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 mb-6 text-sm hover:underline" style={{ color: '#303870' }}
          >
            SEE DOB BIS FOR FULL BUILDING DETAIL
            <ExternalLink size={14} />
          </a>
        )}
        {property.loading ? (
          <div className="flex items-center justify-center gap-2" style={{ color: '#303870' }}>
            <Loader2 className="animate-spin" size={18} />
            <span>Looking up property details...</span>
          </div>
        ) : property.error ? (
          <p className="text-center" style={{ color: '#303870' }}>{property.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <InfoCard label="Borough" value={property.borough} />
              <InfoCard label="Block" value={property.block} />
              <InfoCard label="Lot" value={property.lot} />
              <InfoCard label="BIN" value={property.bin} />
              <InfoCard label="Zoning" value={[property.zoneDist1, property.zoneDist2].filter(Boolean).join(" / ")} />
              <InfoCard label="Building Class" value={property.bldgClass} />
              <InfoCard label="Land Use" value={LAND_USE_LABELS[property.landUse] || property.landUse} />
              <InfoCard label="Owner" value={property.ownerName} />
              <InfoCard label="Floors" value={property.numFloors} />
              <InfoCard label="Year Built" value={property.yearBuilt} />
              <InfoCard label="Lot Area (sq ft)" value={property.lotArea} />
              <InfoCard label="Building Area (sq ft)" value={property.bldgArea} />
            </div>


            {/* Conversion Eligibility */}
            <div className="mt-10 max-w-3xl mx-auto">
              <h3 className="text-2xl font-semibold mb-4 text-center uppercase" style={{ color: '#303870' }}>Conversion Eligibility</h3>
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <p className="text-xs mb-4" style={{ color: '#303870', opacity: 0.7 }}>
                  Analysis based on NYC 467-m program requirements and City of Yes zoning amendments.{" "}
                  <a href="https://comptroller.nyc.gov/reports/office-to-residential-conversions-in-nyc-economics-and-fiscal-estimates/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#303870' }}>
                    Source
                  </a>
                </p>
                <EligibilityChecklist property={property} />
              </div>
            </div>

            {/* Next Steps or Search New Property */}
            <div className="mt-10 max-w-3xl mx-auto">
              {getEligibility(property) ? (
                <>
                  <h3 className="text-2xl font-semibold mb-4 text-center uppercase" style={{ color: '#303870' }}>Next Steps</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <a
                      href={`https://id-preview--51659df5-dc67-4351-82f9-ec303c915f32.lovable.app?address=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-5 shadow-sm border hover:shadow-md transition-shadow text-center group" style={{ backgroundColor: '#FFDF6F' }}
                    >
                      <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center mx-auto mb-3">
                        <Building2 className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <p className="font-semibold uppercase text-sm transition-colors" style={{ color: '#303870' }}>Permit Insight Pro</p>
                      <p className="text-xs mt-1" style={{ color: '#303870', opacity: 0.7 }}>Deep permit & filing analysis</p>
                    </a>
                    <a
                      href="https://id-preview--852bc032-1db9-4c07-ab9f-2b56fe9f7f49.lovable.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-5 shadow-sm border hover:shadow-md transition-shadow text-center group" style={{ backgroundColor: '#FFDF6F' }}
                    >
                      <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center mx-auto mb-3">
                        <Building2 className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <p className="font-semibold uppercase text-sm transition-colors" style={{ color: '#303870' }}>NYC Conversion Insights</p>
                      <p className="text-xs mt-1" style={{ color: '#303870', opacity: 0.7 }}>Market data & conversion trends</p>
                    </a>
                    <a
                      href={`https://id-preview--2028e3fc-b3d6-4f67-8671-0979839c4b1b.lovable.app?address=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-5 shadow-sm border hover:shadow-md transition-shadow text-center group" style={{ backgroundColor: '#FFDF6F' }}
                    >
                      <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center mx-auto mb-3">
                        <Building2 className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <p className="font-semibold uppercase text-sm transition-colors" style={{ color: '#303870' }}>Rental Value Finder</p>
                      <p className="text-xs mt-1" style={{ color: '#303870', opacity: 0.7 }}>Post-conversion rental estimates</p>
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-lg font-semibold uppercase hover:opacity-90 transition-opacity text-sm" style={{ backgroundColor: '#303870' }}
                  >
                    <Building2 size={16} />
                    Search New Property
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
