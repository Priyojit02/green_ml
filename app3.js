import React, { useState, useRef, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  AppBar,
  Toolbar,
  Box,
  Paper,
  Collapse,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios";

/* --- simple format util --- */
const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "-";
  return Math.round(Number(val)).toLocaleString("en-IN");
};

export default function App() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const resultsRef = useRef(null);

  const canonicalCols = [
    "Client Revenue",
    "Number of Users",
    "RICEFW",
    "Duration (Months)",
    "Countries/Market",
  ];

  const handleChange = (key, value) => {
    setResults(null);
    setErrorMsg("");
    setInputs((p) => {
      if (value === "" || value === null) {
        const copy = { ...p };
        delete copy[key];
        return copy;
      }
      return { ...p, [key]: value };
    });
  };

  const hasAnyInput = Object.keys(inputs).length > 0;

  const handlePredict = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await axios.post("https://greenfield-ml-model-1b.onrender.com/predict", { inputs });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Unable to contact the prediction service. Please check backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs({});
    setResults(null);
    setErrorMsg("");
  };

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

  /* derived/auto fields */
  const indiaPct = Number(inputs["India %"] || 0);
  const ukPct = isNaN(indiaPct) ? "" : Math.max(0, 100 - indiaPct);

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(to right,#ece9e6,#fff)" }}>
      <AppBar position="static" sx={{ backgroundColor: "#1976d2" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SAP GreenField Project — AI Based Effort Estimator
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, pb: 6 }}>
        <Paper elevation={3} sx={{ p: isSmall ? 2 : 3, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>Effort Estimator</Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Input following values for effort estimation.
          </Typography>

          {/* ===== RESPONSIVE FLEX ROW FOR THE 5 CORE FIELDS =====
              - On medium+ screens this will keep them in one line.
              - Each field has flex: "1 1 18%" (about 5 across).
              - minWidth prevents extreme squeezing.
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
            {canonicalCols.map((col) => (
              <Box
                key={col}
                sx={{
                  flex: "1 1 18%",
                  minWidth: 140,      // prevents too-small
                }}
              >
                <TextField
                  size="small"
                  label={col === "Client Revenue" ? "Client Revenue (in GBP(Billion))" : col}
                  variant="outlined"
                  fullWidth
                  type={col === "Countries/Market" ? "text" : "number"}
                  value={inputs[col] ?? ""}
                  onChange={(e) => handleChange(col, e.target.value)}
                />
              </Box>
            ))}
          </Box>

          {/* ===== SECOND ROW: Blended rate, currency select, India %, UK (auto) ===== */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: isSmall ? "wrap" : "nowrap", alignItems: "center" }}>
            <Box sx={{ flex: "1 1 18%", minWidth: 140 }}>
              <TextField
                size="small"
                label="Blended rate (rate per man-day in selected currency)"
                fullWidth
                type="number"
                value={inputs["Blended rate"] ?? ""}
                onChange={(e) => handleChange("Blended rate", e.target.value)}
              />
            </Box>

            <Box sx={{ flex: "0 0 160px", minWidth: 140 }}>
              <FormControl fullWidth size="small">
                <InputLabel>User currency</InputLabel>
                <Select
                  label="User currency"
                  value={inputs["User currency"] ?? ""}
                  onChange={(e) => handleChange("User currency", e.target.value)}
                >
                  <MenuItem value="">(select)</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="INR">INR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: "1 1 12%", minWidth: 120 }}>
              <TextField
                size="small"
                label="India component %"
                fullWidth
                type="number"
                value={inputs["India %"] ?? ""}
                onChange={(e) => handleChange("India %", e.target.value)}
              />
            </Box>

            <Box sx={{ flex: "1 1 12%", minWidth: 120 }}>
              <TextField
                size="small"
                label="UK component % (auto)"
                fullWidth
                value={isNaN(ukPct) ? "" : ukPct}
                InputProps={{ readOnly: true }}
              />
            </Box>

            <Box sx={{ flex: "1 1 12%", minWidth: 120 }}>
              <TextField
                size="small"
                label="Estimated revenue (auto)"
                fullWidth
                value={
                  // estimatedRevenue = estimatedEffort * blended_rate (only show if both present)
                  inputs["Estimated Effort"] && inputs["Blended rate"]
                    ? (Number(inputs["Estimated Effort"]) * Number(inputs["Blended rate"])).toLocaleString()
                    : ""
                }
                InputProps={{ readOnly: true }}
              />
            </Box>
          </Box>

          {/* ACTIONS */}
          <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={handlePredict}
              disabled={loading || !hasAnyInput}
              sx={{
                backgroundColor: hasAnyInput ? "#1976d2" : "#9e9e9e",
                fontWeight: "bold",
              }}
            >
              {loading ? "Estimating..." : "Estimate Effort"}
            </Button>

            <Button variant="outlined" onClick={handleReset}>Clear</Button>
          </Box>

          {errorMsg && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Typography>
          )}
        </Paper>

        {/* RESULTS */}
        <div ref={resultsRef}>
          <Collapse in={Boolean(results)} timeout={400}>
            {results && (
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Estimated Results</Typography>

                <Grid container spacing={2}>
                  {Object.entries(results.predictions || {}).map(([k, v]) => (
                    <Grid item xs={12} sm={6} md={4} key={k}>
                      <CardContent sx={{ border: "1px solid #eee", borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">{k}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>{formatNumber(v)}</Typography>
                      </CardContent>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Collapse>
        </div>
      </Container>
    </Box>
  );
}
