// src/App.jsx
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
  LinearProgress,
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
} from "@mui/material";
import axios from "axios";

const canonicalCols = [
  "Client Revenue", // label will show units in UI
  "Number of Users",
  "RICEFW",
  "Duration (Months)",
  "Countries/Market",
  "Estimated Effort (man days)",
];

const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return "-";
  }
  return Math.round(Number(val)).toLocaleString("en-IN");
};

const formatCurrency = (val, currencyCode) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "-";
  const n = Number(val);
  const symbolMap = { GBP: "£", INR: "₹", USD: "$" };
  const symbol = symbolMap[currencyCode] || `${currencyCode} `;
  // keep 2 decimals for revenue
  return symbol + n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

function App() {
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  // for smooth scroll to results after prediction
  const resultsRef = useRef(null);

  const handleChange = (col, val) => {
    setResults(null);
    setErrorMsg("");
    if (val === "") {
      const copy = { ...inputs };
      delete copy[col];
      setInputs(copy);
    } else {
      setInputs({ ...inputs, [col]: val });
    }
  };

  const hasAnyInput = Object.keys(inputs).length > 0;

  const handlePredict = async () => {
    setErrorMsg("");
    try {
      setLoading(true);
      const res = await axios.post("https://greenfield-ml-model-1b.onrender.com/predict", {
        inputs,
      });
      setResults(res.data);
    } catch (err) {
      console.error("Prediction error:", err);
      setErrorMsg(
        "Unable to contact the prediction service. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs({});
    setResults(null);
    setErrorMsg("");
  };

  // scroll to results when they appear
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [results]);

  // Filter report for Estimated Effort
  const effortReports =
    results?.reports?.filter((r) => r.target === "Estimated Effort (man days)") || [];
  const effortReport = effortReports[0] || null;
  const effortPrediction =
    results?.predictions?.["Estimated Effort (man days)"] ?? null;

  // New derived values
  const blendedRate = inputs.blendedRate ? Number(inputs.blendedRate) : null;
  const userCurrency = inputs.userCurrency || "GBP";
  const indiaPct = inputs.indiaComponentPct ? Number(inputs.indiaComponentPct) : null;
  const ukPct = indiaPct == null || isNaN(indiaPct) ? null : 100 - indiaPct;

  const estimatedRevenue =
    effortPrediction != null && blendedRate != null
      ? Number(effortPrediction) * Number(blendedRate)
      : null;

  return (
    <Box
      sx={{
        flexGrow: 1,
        background: "linear-gradient(to right, #ece9e6, #ffffff)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: "#1976d2" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SAP GreenField Project-AI Based Effort Estimator
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, pb: 6 }}>
        {/* Input Section */}
        <Paper
          elevation={3}
          sx={{
            p: isSmall ? 2 : 3,
            mb: 4,
            borderRadius: 3,
          }}
        >
          <Typography variant="h5" gutterBottom>
            Effort Estimator
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Input following Values of fields for Effort estimation.
          </Typography>

          {/*
            Replaced the Grid container for the top 5 fields with a responsive flex row.
            On medium+ width this will try to keep 5 fields in a single row (each flex: 1 1 18%).
            On small screens it will wrap.
          */}
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
              .slice(0, 5) // ensure only the 5 fields show in this row
              .map((col) => {
                // show unit text for Client Revenue in the label only
                const label =
                  col === "Client Revenue" ? "Client Revenue (in GBP(Billion))" : col;
                return (
                  <Box
                    key={col}
                    sx={{
                      flex: "1 1 18%",
                      minWidth: 140, // prevents the field from collapsing too narrow
                    }}
                  >
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

          {/* NEW: Blended rate, Currency, India component % */}
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
                helperText="Rate per man-day in selected currency"
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

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="India component %"
                variant="outlined"
                fullWidth
                type="number"
                inputProps={{ min: 0, max: 100, step: "0.1" }}
                value={inputs.indiaComponentPct ?? ""}
                onChange={(e) => handleChange("indiaComponentPct", e.target.value)}
                size={isSmall ? "small" : "medium"}
                helperText="Percentage of work in India"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3} sx={{ display: "flex", alignItems: "center" }}>
              {/* UK component is not an input; show computed value or placeholder */}
              <TextField
                label="UK component %"
                variant="outlined"
                fullWidth
                value={ukPct == null || isNaN(ukPct) ? "" : ukPct}
                size={isSmall ? "small" : "medium"}
                InputProps={{
                  readOnly: true,
                }}
                helperText="Calculated as 100 - India component %"
              />
            </Grid>
          </Grid>

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
              sx={{
                backgroundColor: hasAnyInput ? "#4caf50" : "#9e9e9e",
                fontWeight: "bold",
              }}
            >
              {loading ? "Estimating..." : "Estimate Effort"}
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              onClick={handleReset}
              disabled={loading && !results}
            >
              Clear
            </Button>
          </Box>

          {errorMsg && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Typography>
          )}
        </Paper>

        {/* Results Section (animated) */}
        <div ref={resultsRef}>
          <Collapse in={Boolean(results)} timeout={500}>
            {results && (
              <>
                {/* Cards */}
                <Paper elevation={2} sx={{ p: isSmall ? 2 : 3, mb: 4, borderRadius: 3 }}>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Estimated Results By Model
                  </Typography>

                  <Grid container spacing={3}>
                    {Object.entries(results.predictions || {}).map(([field, val]) => {
                      const providedByUser = field in inputs;
                      return (
                        <Grid item xs={12} sm={6} md={4} key={field}>
                          <Card
                            sx={{
                              boxShadow: 2,
                              borderRadius: 3,
                              border: providedByUser ? "2px solid #81c784" : "1px solid #e0e0e0",
                              transition: "transform 0.15s ease, box-shadow 0.15s ease",
                              "&:hover": {
                                transform: "translateY(-3px)",
                                boxShadow: 4,
                              },
                            }}
                          >
                            <CardContent>
                              <Typography variant="subtitle2" color="textSecondary">
                                {field}
                              </Typography>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: "bold",
                                  color: "#1976d2",
                                  mt: 0.5,
                                }}
                              >
                                {formatNumber(val)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                {providedByUser ? "Provided by user" : "Estimated by model"}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}

                    {/* NEW: show India %, UK %, and Estimated Revenue as cards */}
                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ boxShadow: 2, borderRadius: 3 }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary">
                            India component %
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2", mt: 0.5 }}>
                            {indiaPct == null || isNaN(indiaPct) ? "-" : `${indiaPct}%`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            User input
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ boxShadow: 2, borderRadius: 3 }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary">
                            UK component %
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2", mt: 0.5 }}>
                            {ukPct == null || isNaN(ukPct) ? "-" : `${ukPct}%`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Computed: 100 - India component %
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ boxShadow: 2, borderRadius: 3 }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary">
                            Estimated Revenue
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2", mt: 0.5 }}>
                            {estimatedRevenue == null || isNaN(estimatedRevenue)
                              ? "-"
                              : formatCurrency(estimatedRevenue, userCurrency)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            estimatedRevenue = estimatedEffort × blendedRate
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Table Section */}
                <Paper elevation={2} sx={{ p: isSmall ? 2 : 3, mb: 4, borderRadius: 3 }}>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    Estimation Table
                  </Typography>

                  <Table sx={{ boxShadow: 1, borderRadius: 2 }}>
                    <TableHead sx={{ backgroundColor: "#f0f0f0" }}>
                      <TableRow>
                        <TableCell>
                          <b>Field</b>
                        </TableCell>
                        <TableCell>
                          <b>Estimated Value</b>
                        </TableCell>
                        <TableCell>
                          <b>Source</b>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(results.predictions || {}).map(([field, val]) => (
                        <TableRow key={field}>
                          <TableCell>{field}</TableCell>
                          <TableCell>{formatNumber(val)}</TableCell>
                          <TableCell>{field in inputs ? "Provided by user" : "Estimated by model"}</TableCell>
                        </TableRow>
                      ))}

                      {/* add India/UK/Estimated Revenue rows */}
                      <TableRow>
                        <TableCell>India component %</TableCell>
                        <TableCell>{indiaPct == null || isNaN(indiaPct) ? "-" : `${indiaPct}%`}</TableCell>
                        <TableCell>User input</TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>UK component %</TableCell>
                        <TableCell>{ukPct == null || isNaN(ukPct) ? "-" : `${ukPct}%`}</TableCell>
                        <TableCell>Computed (100 - India %)</TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>Estimated Revenue</TableCell>
                        <TableCell>
                          {estimatedRevenue == null || isNaN(estimatedRevenue)
                            ? "-"
                            : formatCurrency(estimatedRevenue, userCurrency)}
                        </TableCell>
                        <TableCell>Calculated</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>

                {/* Reliability Section for Estimated Effort */}
                {effortReport && (
                  <Paper elevation={2} sx={{ p: isSmall ? 2 : 3, borderRadius: 3 }}>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      Reliability for Estimated Effort (man days)
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                      Train/test split used: 8 train / 5 test rows (fixed).
                      Reliability is R² on the held-out test set, expressed as a
                      percentage.
                    </Typography>

                    {/* Progress bar */}
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(effortReport.r2_mean || 0) * 100}
                        sx={{ height: 12, borderRadius: 5 }}
                      />
                      <Typography sx={{ mt: 1 }}>
                        Reliability: {((effortReport.r2_mean || 0) * 100).toFixed(1)}%
                      </Typography>
                    </Box>

                    {/* Reliability Detail Table */}
                    <Table sx={{ maxWidth: 900 }}>
                      <TableHead sx={{ backgroundColor: "#f7f7f7" }}>
                        <TableRow>
                          <TableCell>
                            <b>Target</b>
                          </TableCell>
                          <TableCell>
                            <b>Model</b>
                          </TableCell>
                          <TableCell>
                            <b>Reliability (%)</b>
                          </TableCell>
                          <TableCell>
                            <b>MAE (man days)</b>
                          </TableCell>
                          <TableCell>
                            <b>Current Estimated Value (man days)</b>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>{effortReport.target}</TableCell>
                          <TableCell>{effortReport.model_name}</TableCell>
                          <TableCell>{((effortReport.r2_mean || 0) * 100).toFixed(2)}</TableCell>
                          <TableCell>{formatNumber(effortReport.mae_mean)}</TableCell>
                          <TableCell>{formatNumber(effortPrediction)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </>
            )}
          </Collapse>
        </div>
      </Container>
    </Box>
  );
}

export default App;
