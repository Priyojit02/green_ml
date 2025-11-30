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
const BACKEND_EXCEL_URL = "http://127.0.0.1:8009/backend_excel"; // adjust if your backend runs on another port

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
    } else setInputs({ ...inputs, [col]: val });
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
      setErrorMsg("Unable to contact the prediction service. Please check that the backend is running.");
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

  const effortReports = results?.reports?.filter((r) => r.target === "Estimated Effort (man days)") || [];
  const effortReport = effortReports[0] || null;
  const effortPrediction = results?.predictions?.["Estimated Effort (man days)"] ?? null;

  // Derived
  const blendedRate = inputs.blendedRate ? Number(inputs.blendedRate) : null;
  const userCurrency = inputs.userCurrency || "GBP";
  const indiaPct = inputs.indiaComponentPct ? Number(inputs.indiaComponentPct) : null;
  const ukPct = indiaPct == null || isNaN(indiaPct) ? null : 100 - indiaPct;
  const estimatedRevenue = effortPrediction != null && blendedRate != null ? Number(effortPrediction) * Number(blendedRate) : null;

  // Load Book3.xlsx (public)
  const loadBenchmarkFromPublic = async () => {
    setLoadingBenchmark(true);
    setErrorMsg("");
    try {
      const resp = await fetch(EXCEL_PUBLIC_PATH);
      if (!resp.ok) throw new Error(`Could not fetch ${EXCEL_PUBLIC_PATH} (${resp.status})`);
      const arrayBuffer = await resp.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error("Workbook contains no sheets.");
      const first = workbook.SheetNames[0];
      const ws = workbook.Sheets[first];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setBenchmarkRows(json || []);
      setBenchmarkCols(json && json.length ? Object.keys(json[0]) : []);
    } catch (e) {
      console.error("Benchmark load error:", e);
      setErrorMsg(String(e.message || e));
      setBenchmarkRows([]);
      setBenchmarkCols([]);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  // Load backend Book2_backend.xlsx
  const loadBackendExcel = async () => {
    setLoadingBenchmark(true);
    setErrorMsg("");
    try {
      // backend endpoint implemented as POST in your backend; if GET, change method
      const resp = await fetch(BACKEND_EXCEL_URL, { method: "POST" });
      if (!resp.ok) throw new Error(`Could not fetch backend excel (${resp.status})`);
      const arrayBuffer = await resp.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error("Backend workbook contains no sheets.");
      const first = workbook.SheetNames[0];
      const ws = workbook.Sheets[first];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setBackendRows(json || []);
      setBackendCols(json && json.length ? Object.keys(json[0]) : []);
    } catch (e) {
      console.error("Backend load error:", e);
      setErrorMsg(String(e.message || e));
      setBackendRows([]);
      setBackendCols([]);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  // On click: load Book3 first, then backend Book2
  const onBenchmarkClick = async () => {
    setLoadingBenchmark(true);
    setErrorMsg("");
    try {
      await loadBenchmarkFromPublic();
      await loadBackendExcel();
      setShowBenchmark(true);
    } catch (err) {
      console.error("Benchmark combined load error:", err);
      setErrorMsg(String(err || "Failed to load benchmark files"));
    } finally {
      setLoadingBenchmark(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, background: "linear-gradient(to right, #ece9e6, #ffffff)", minHeight: "100vh" }}>
      <AppBar position="static" sx={{ backgroundColor: "#1976d2" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SAP GreenField Project - AI Based Effort Estimator
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, pb: 6 }}>
        <Paper elevation={3} sx={{ p: isSmall ? 2 : 3, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>
            Effort Estimator
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Input following values for effort estimation.
          </Typography>

          {/* Top row: 5 inputs in one line on wide screens */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: isSmall ? "wrap" : "nowrap",
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            {canonicalCols
              .filter((col) => col !== "Estimated Effort (man days)")
              .slice(0, 5)
              .map((col) => {
                const label = col === "Client Revenue" ? "Client Revenue (in GBP(Billion))" : col;
                return (
                  <Box key={col} sx={{ flex: "1 1 18%", minWidth: 140 }}>
                    <TextField
                      label={label}
                      variant="outlined"
                      fullWidth
                      type={col === "Countries/Market" ? "text" : "number"}
                      inputProps={{ min: 0 }}
                      value={inputs[col] ?? ""}
                      onChange={(e) => handleChange(col, e.target.value)}
                      size={isSmall ? "small" : "medium"}
                    />
                  </Box>
                );
              })}
          </Box>

          {/* second row */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Blended rate"
                variant="outlined"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: "0.01" }}
                value={inputs.blendedRate ?? ""}
                onChange={(e) => handleChange("blendedRate", e.target.value)}
                size={isSmall ? "small" : "medium"}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size={isSmall ? "small" : "medium"}>
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

            {/* New fields row: Wave / Team / Role / Count IN / Count UK */}
            <Grid item xs={12} sm={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={6}>
                  <TextField
                    label="Wave"
                    variant="outlined"
                    fullWidth
                    value={inputs.wave ?? ""}
                    onChange={(e) => handleChange("wave", e.target.value)}
                    size={isSmall ? "small" : "medium"}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={6}>
                  <TextField
                    label="Team"
                    variant="outlined"
                    fullWidth
                    value={inputs.team ?? ""}
                    onChange={(e) => handleChange("team", e.target.value)}
                    size={isSmall ? "small" : "medium"}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={6}>
                  <TextField
                    label="Role"
                    variant="outlined"
                    fullWidth
                    value={inputs.role ?? ""}
                    onChange={(e) => handleChange("role", e.target.value)}
                    size={isSmall ? "small" : "medium"}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Count IN"
                    variant="outlined"
                    fullWidth
                    type="number"
                    inputProps={{ min: 0 }}
                    value={inputs.countIN ?? ""}
                    onChange={(e) => handleChange("countIN", e.target.value)}
                    size={isSmall ? "small" : "medium"}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Count UK"
                    variant="outlined"
                    fullWidth
                    type="number"
                    inputProps={{ min: 0 }}
                    value={inputs.countUK ?? ""}
                    onChange={(e) => handleChange("countUK", e.target.value)}
                    size={isSmall ? "small" : "medium"}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Start / End month-year pickers */}
            <Grid item xs={12} sm={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={6}>
                  <TextField
                    label="Start (month / year)"
                    type="month"
                    fullWidth
                    value={inputs.startMonth ?? ""}
                    onChange={(e) => handleChange("startMonth", e.target.value)}
                    size={isSmall ? "small" : "medium"}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={6}>
                  <TextField
                    label="End (month / year)"
                    type="month"
                    fullWidth
                    value={inputs.endMonth ?? ""}
                    onChange={(e) => handleChange("endMonth", e.target.value)}
                    size={isSmall ? "small" : "medium"}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {/* actions */}
          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexDirection: isSmall ? "column" : "row",
              gap: 2,
              alignItems: isSmall ? "stretch" : "center",
            }}
          >
            <Button
              variant="contained"
              onClick={handlePredict}
              disabled={loading || !hasAnyInput}
              sx={{ backgroundColor: hasAnyInput ? "#4caf50" : "#9e9e9e", fontWeight: "bold" }}
            >
              {loading ? "Estimating..." : "Estimate Effort"}
            </Button>

            <Button variant="outlined" color="inherit" onClick={handleReset} disabled={loading && !results}>
              Clear
            </Button>
          </Box>

          {errorMsg && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Typography>
          )}
        </Paper>

        {/* Results */}
        <div ref={resultsRef}>
          <Collapse in={Boolean(results)} timeout={500}>
            {results && (
              <Paper elevation={2} sx={{ p: isSmall ? 2 : 3, mb: 4, borderRadius: 3, position: "relative" }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  Estimated Results By Model
                </Typography>

                {/* TOP ROW */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    { key: "Client Revenue", label: "Client Revenue" },
                    { key: "Number of Users", label: "Number of Users" },
                    { key: "RICEFW", label: "RICEFW" },
                    { key: "Duration (Months)", label: "Duration (Months)" },
                    { key: "Countries/Market", label: "Countries/Market" },
                  ].map(({ key, label }) => {
                    const value = inputs[key] ?? results.predictions?.[key] ?? "-";
                    return (
                      <Grid item xs={12} sm={6} md={2.4} key={key}>
                        <Card sx={{ boxShadow: 2, borderRadius: 2, border: key in inputs ? "2px solid #81c784" : "2px solid #4caf50" }}>
                          <CardContent>
                            <Typography variant="subtitle2" color="textSecondary">
                              {label}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: "bold", mt: 0.5 }}>
                              {label === "Client Revenue"
                                ? inputs["Client Revenue"] ?? results.predictions?.["Client Revenue"]
                                  ? formatNumber(inputs["Client Revenue"] ?? results.predictions?.["Client Revenue"])
                                  : "-"
                                : value === "-"
                                ? "-"
                                : String(value)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {key in inputs ? "Provided by user" : "Estimated by model"}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}

                  {/* India and UK % */}
                  <Grid item xs={6} sm={3} md={1.8}>
                    <Card sx={{ boxShadow: 2, borderRadius: 2, border: "2px solid #81c784" }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          India component %
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: "bold", mt: 0.5 }}>
                          {indiaPct == null || isNaN(indiaPct) ? "-" : `${indiaPct}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          User input
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={3} md={1.8}>
                    <Card sx={{ boxShadow: 2, borderRadius: 2, border: "2px solid #81c784" }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          UK component %
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: "bold", mt: 0.5 }}>
                          {ukPct == null || isNaN(ukPct) ? "-" : `${ukPct}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          Computed
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* BOTTOM ROW: Estimated Revenue and Estimated Effort */}
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Card sx={{ boxShadow: 2, borderRadius: 3, border: "2px solid #D32F2F" }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          Estimated Revenue
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2", mt: 0.5 }}>
                          {estimatedRevenue == null || isNaN(estimatedRevenue) ? "-" : formatCurrency(estimatedRevenue, userCurrency)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          Estimated Through Model Calculation
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card sx={{ boxShadow: 2, borderRadius: 3, border: "2px solid #D32F2F" }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          Estimated Effort (man days)
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2", mt: 0.5 }}>
                          {effortPrediction == null || isNaN(Number(effortPrediction)) ? "-" : formatNumber(effortPrediction)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          Model prediction
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ position: "absolute", right: 16, bottom: 12 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Reliability (R² %):{" "}
                    {effortReport && effortReport.r2_mean != null ? ((effortReport.r2_mean || 0) * 100).toFixed(1) + "%" : "48.7%"}
                  </Typography>
                </Box>

                <Box sx={{ mt: 3, display: "flex", gap: 2, alignItems: "center" }}>
                  <Button variant="contained" color="secondary" onClick={onBenchmarkClick} disabled={loadingBenchmark}>
                    {loadingBenchmark ? "Loading..." : "Show Benchmark"}
                  </Button>
                </Box>
              </Paper>
            )}
          </Collapse>
        </div>

        {showBenchmark && (
          <Paper elevation={3} sx={{ p: 2, mt: 3, borderRadius: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6">Benchmark Data</Typography>
              <IconButton
                onClick={() => {
                  setShowBenchmark(false);
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <Paper variant="outlined" sx={{ height: 520, overflow: "auto", p: 1 }}>
              {benchmarkRows.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No data loaded. Click Benchmark to load the local Excel from <code>{EXCEL_PUBLIC_PATH}</code>.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {benchmarkCols.map((c) => (
                          <TableCell key={c} sx={{ fontWeight: 700 }}>
                            {c}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {benchmarkRows.map((row, idx) => (
                        <TableRow key={idx}>
                          {benchmarkCols.map((c) => (
                            <TableCell key={c + idx}>{String(row[c] ?? "")}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Box sx={{ mt: 3 }}>
                <Typography variant="h6">Backend: Book2_backend.xlsx (Estimated Effort History)</Typography>
                <Paper variant="outlined" sx={{ height: 320, overflow: "auto", p: 1, mt: 1 }}>
                  {backendRows.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      No backend data found.
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {backendCols.map((c) => (
                              <TableCell key={c} sx={{ fontWeight: 700 }}>
                                {c}
                              </TableCell>
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
                  )}
                </Paper>
              </Box>
            </Paper>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
