import React, { useState, useRef, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  AppBar,
  Toolbar,
  Box,
  Paper,
  Collapse,
  useMediaQuery,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  TableContainer,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import * as XLSX from "xlsx";

/* Place Book3.xlsx in: public/Book3.xlsx */
const canonicalCols = [
  "Client Revenue",
  "Number of Users",
  "RICEFW",
  "Duration (Months)",
  "Countries/Market",
  "Estimated Effort (man days)",
];

const EXCEL_PUBLIC_PATH = "/Book3.xlsx";
const BACKEND_EXCEL_URL = "http://127.0.0.1:8009/backend_excel";

const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "-";
  return Math.round(Number(val)).toLocaleString("en-IN");
};

const formatCurrency = (val, currencyCode) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "-";
  const n = Number(val);
  const symbolMap = { GBP: "£", INR: "₹", USD: "$", EUR: "€" };
  const symbol = symbolMap[currencyCode] || `${currencyCode} `;
  return symbol + n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

export default function App() {
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showBenchmark, setShowBenchmark] = useState(false);

  // Book3 (public)
  const [benchmarkRows, setBenchmarkRows] = useState([]);
  const [benchmarkCols, setBenchmarkCols] = useState([]);

  // Book2 (backend)
  const [backendRows, setBackendRows] = useState([]);
  const [backendCols, setBackendCols] = useState([]);

  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const resultsRef = useRef(null);

  const handleChange = (col, val) => {
    setResults(null);
    setErrorMsg("");

    if (val === "") {
      const c = { ...inputs };
      delete c[col];
      setInputs(c);
      return;
    }
    setInputs({ ...inputs, [col]: val });
  };

  const hasAnyInput = Object.keys(inputs).length > 0;

  const handlePredict = async () => {
    setErrorMsg("");
    try {
      setLoading(true);
      const res = await axios.post("http://127.0.0.1:8009/predict", { inputs });
      setResults(res.data);
    } catch (err) {
      console.error("Prediction error:", err);
      setErrorMsg("Unable to contact prediction backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs({});
    setResults(null);
    setErrorMsg("");
    setShowBenchmark(false);
    setBenchmarkRows([]);
    setBenchmarkCols([]);
    setBackendRows([]);
    setBackendCols([]);
  };

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

  const effortReports =
    results?.reports?.filter((r) => r.target === "Estimated Effort (man days)") || [];
  const effortReport = effortReports[0] || null;

  const effortPrediction = results?.predictions?.["Estimated Effort (man days)"] ?? null;

  const blendedRate = inputs.blendedRate ? Number(inputs.blendedRate) : null;
  const userCurrency = inputs.userCurrency || "GBP";
  const indiaPct = inputs.indiaComponentPct ? Number(inputs.indiaComponentPct) : null;
  const ukPct = indiaPct == null || isNaN(indiaPct) ? null : 100 - indiaPct;

  const estimatedRevenue =
    effortPrediction != null && blendedRate != null
      ? Number(effortPrediction) * Number(blendedRate)
      : null;

  // ---------------- Load Book3 -------------------
  const loadBenchmarkFromPublic = async () => {
    setLoadingBenchmark(true);
    try {
      const resp = await fetch(EXCEL_PUBLIC_PATH);
      if (!resp.ok) throw new Error("Unable to load Book3.xlsx");

      const buffer = await resp.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.SheetNames[0];
      const json = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: "" });

      setBenchmarkRows(json);
      setBenchmarkCols(Object.keys(json[0] || {}));
    } catch (e) {
      setErrorMsg(String(e.message || e));
    } finally {
      setLoadingBenchmark(false);
    }
  };

  // ---------------- Load Book2 Backend -------------------
  const loadBackendExcel = async () => {
    setLoadingBenchmark(true);
    try {
      const resp = await fetch(BACKEND_EXCEL_URL, { method: "POST" });
      if (!resp.ok) throw new Error("Unable to load backend excel");

      const buffer = await resp.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.SheetNames[0];
      const json = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: "" });

      setBackendRows(json);
      setBackendCols(Object.keys(json[0] || {}));
    } catch (e) {
      setErrorMsg(String(e.message || e));
    } finally {
      setLoadingBenchmark(false);
    }
  };

  const onBenchmarkClick = async () => {
    try {
      await loadBenchmarkFromPublic();
      await loadBackendExcel();
      setShowBenchmark(true);
    } catch (e) {
      setErrorMsg("Failed loading benchmark");
    }
  };

  return (
    <Box sx={{ flexGrow: 1, background: "#f5f5f5", minHeight: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SAP GreenField Project - AI Effort Estimator
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, pb: 6 }}>
        {/* ======================== INPUT PANEL ============================ */}
        <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>
            Effort Estimator
          </Typography>

          {/* TOP ROW INPUTS */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            {canonicalCols
              .filter((c) => c !== "Estimated Effort (man days)")
              .slice(0, 5)
              .map((col) => (
                <TextField
                  key={col}
                  label={col}
                  fullWidth
                  type={col === "Countries/Market" ? "text" : "number"}
                  value={inputs[col] ?? ""}
                  onChange={(e) => handleChange(col, e.target.value)}
                />
              ))}
          </Box>

          {/* SECOND ROW (original fields) */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Blended rate"
                fullWidth
                type="number"
                value={inputs.blendedRate ?? ""}
                onChange={(e) => handleChange("blendedRate", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>User currency</InputLabel>
                <Select
                  label="User currency"
                  value={inputs.userCurrency ?? "GBP"}
                  onChange={(e) => handleChange("userCurrency", e.target.value)}
                >
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="INR">INR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="India component %"
                type="number"
                fullWidth
                value={inputs.indiaComponentPct ?? ""}
                onChange={(e) => handleChange("indiaComponentPct", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* UK component */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="UK component %"
                fullWidth
                value={ukPct == null || isNaN(ukPct) ? "" : ukPct}
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </Grid>

          {/* ========== NEW ROW (Wave/Team/Role/CountIN/CountUK) ============ */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={2.4}>
              <TextField
                label="Wave"
                fullWidth
                value={inputs.wave ?? ""}
                onChange={(e) => handleChange("wave", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                label="Team"
                fullWidth
                value={inputs.team ?? ""}
                onChange={(e) => handleChange("team", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                label="Role"
                fullWidth
                value={inputs.role ?? ""}
                onChange={(e) => handleChange("role", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                label="Count IN"
                type="number"
                fullWidth
                value={inputs.countIN ?? ""}
                onChange={(e) => handleChange("countIN", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                label="Count UK"
                type="number"
                fullWidth
                value={inputs.countUK ?? ""}
                onChange={(e) => handleChange("countUK", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Start & End Month */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Start (month/year)"
                type="month"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={inputs.startMonth ?? ""}
                onChange={(e) => handleChange("startMonth", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                label="End (month/year)"
                type="month"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={inputs.endMonth ?? ""}
                onChange={(e) => handleChange("endMonth", e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Buttons */}
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={handlePredict} disabled={!hasAnyInput}>
              {loading ? "Estimating..." : "Estimate Effort"}
            </Button>

            <Button variant="outlined" onClick={handleReset}>
              Clear
            </Button>
          </Box>

          {errorMsg && (
            <Typography color="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Typography>
          )}
        </Paper>

        {/* ======================== RESULTS PANEL ============================ */}
        <div ref={resultsRef}>
          <Collapse in={Boolean(results)}>
            {results && (
              <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3, position: "relative" }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  Estimated Results By Model
                </Typography>

                {/* TOP ROW RESULTS */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {["Client Revenue", "Number of Users", "RICEFW", "Duration (Months)", "Countries/Market"].map(
                    (key) => (
                      <Grid item xs={12} sm={6} md={2.4} key={key}>
                        <Card sx={{ border: "2px solid #4caf50" }}>
                          <CardContent>
                            <Typography variant="subtitle2">{key}</Typography>
                            <Typography variant="h6">
                              {formatNumber(inputs[key] ?? results.predictions?.[key] ?? "-")}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    )
                  )}

                  <Grid item xs={6} sm={3} md={1.8}>
                    <Card sx={{ border: "2px solid #81c784" }}>
                      <CardContent>
                        <Typography>India %</Typography>
                        <Typography variant="h6">{indiaPct ?? "-"}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={3} md={1.8}>
                    <Card sx={{ border: "2px solid #81c784" }}>
                      <CardContent>
                        <Typography>UK %</Typography>
                        <Typography variant="h6">{ukPct ?? "-"}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Revenue & Effort */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Card sx={{ border: "2px solid #d32f2f" }}>
                      <CardContent>
                        <Typography>Estimated Revenue</Typography>
                        <Typography variant="h6">
                          {estimatedRevenue ? formatCurrency(estimatedRevenue, userCurrency) : "-"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card sx={{ border: "2px solid #d32f2f" }}>
                      <CardContent>
                        <Typography>Estimated Effort</Typography>
                        <Typography variant="h6">
                          {effortPrediction ? formatNumber(effortPrediction) : "-"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Button variant="contained" color="secondary" onClick={onBenchmarkClick}>
                    Show Benchmark
                  </Button>
                </Box>
              </Paper>
            )}
          </Collapse>
        </div>

        {/* ======================== BENCHMARK PANEL ============================ */}
        {showBenchmark && (
          <Paper elevation={3} sx={{ p: 2, borderRadius: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="h6">Benchmark Data</Typography>
              <IconButton onClick={() => setShowBenchmark(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Book3 */}
            <Paper variant="outlined" sx={{ height: 520, overflow: "auto", p: 1 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {benchmarkCols.map((c) => (
                        <TableCell key={c}>{c}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {benchmarkRows.map((row, i) => (
                      <TableRow key={i}>
                        {benchmarkCols.map((c) => (
                          <TableCell key={c + i}>{String(row[c] ?? "")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Backend Excel */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6">Backend: Book2_backend.xlsx</Typography>

              <Paper variant="outlined" sx={{ height: 300, overflow: "auto", p: 1 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {backendCols.map((c) => (
                          <TableCell key={c}>{c}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backendRows.map((row, idx) => (
                        <TableRow key={idx}>
                          {backendCols.map((c) => (
                            <TableCell key={c + idx}>{String(row[c] ?? "")}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
