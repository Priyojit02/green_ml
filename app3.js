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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios";

const canonicalCols = [
  "Client Revenue",
  "Number of Users",
  "RICEFW",
  "Duration (Months)",
  "Countries/Market",
];

const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return "-";
  }
  return Math.round(Number(val)).toLocaleString("en-IN");
};

function App() {
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

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

  const effortReports =
    results?.reports?.filter((r) => r.target === "Estimated Effort (man days)") || [];
  const effortReport = effortReports[0] || null;
  const effortPrediction = results?.predictions?.["Estimated Effort (man days)"] ?? null;

  return (
    <Box sx={{ flexGrow: 1, background: "linear-gradient(to right, #ece9e6, #ffffff)", minHeight: "100vh" }}>
      
      {/* HEADER */}
      <AppBar position="static" sx={{ backgroundColor: "#1976d2" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SAP GreenField Project – AI Based Effort Estimator
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, pb: 6 }}>

        {/* INPUT SECTION */}
        <Paper elevation={3} sx={{ p: isSmall ? 2 : 3, mb: 4, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom>Effort Estimator</Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Input following values for effort estimation.
          </Typography>

          {/* ROW OF 5 INPUTS */}
          <Grid container spacing={2}>
            {canonicalCols.map((col) => (
              <Grid item xs={12} sm={4} md={2.4} key={col}>
                <TextField
                  size="small"
                  label={
                    col === "Client Revenue"
                      ? "Client Revenue (in GBP(Billion))"
                      : col
                  }
                  variant="outlined"
                  fullWidth
                  type="number"
                  inputProps={{ min: 0 }}
                  value={inputs[col] ?? ""}
                  onChange={(e) => handleChange(col, e.target.value)}
                />
              </Grid>
            ))}
          </Grid>

          {/* NEW FIELDS BELOW */}
          <Grid container spacing={2} sx={{ mt: 1 }}>

            {/* BLENDED RATE */}
            <Grid item xs={12} sm={4} md={2.4}>
              <TextField
                size="small"
                label="Blended rate"
                fullWidth
                type="number"
                value={inputs["Blended rate"] ?? ""}
                onChange={(e) => handleChange("Blended rate", e.target.value)}
              />
            </Grid>

            {/* CURRENCY DROPDOWN */}
            <Grid item xs={12} sm={4} md={2.4}>
              <FormControl fullWidth size="small">
                <InputLabel>User currency</InputLabel>
                <Select
                  label="User currency"
                  value={inputs["User currency"] ?? ""}
                  onChange={(e) => handleChange("User currency", e.target.value)}
                >
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="INR">INR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* INDIA COMPONENT */}
            <Grid item xs={12} sm={4} md={2.4}>
              <TextField
                size="small"
                label="India component %"
                fullWidth
                type="number"
                value={inputs["India %"] ?? ""}
                onChange={(e) => handleChange("India %", e.target.value)}
              />
            </Grid>

            {/* UK COMPONENT (CALCULATED) */}
            <Grid item xs={12} sm={4} md={2.4}>
              <TextField
                size="small"
                label="UK component % (auto)"
                fullWidth
                value={
                  inputs["India %"]
                    ? 100 - Number(inputs["India %"])
                    : ""
                }
                InputProps={{ readOnly: true }}
              />
            </Grid>

          </Grid>

          {/* BUTTONS */}
          <Box sx={{ mt: 3, display: "flex", flexDirection: isSmall ? "column" : "row", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handlePredict}
              disabled={loading || !hasAnyInput}
              sx={{ backgroundColor: hasAnyInput ? "#4caf50" : "#9e9e9e", fontWeight: "bold" }}
            >
              {loading ? "Estimating..." : "Estimate Effort"}
            </Button>

            <Button variant="outlined" color="inherit" onClick={handleReset}>
              Clear
            </Button>
          </Box>

          {errorMsg && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Typography>
          )}
        </Paper>

        {/* RESULTS SECTION */}
        <div ref={resultsRef}>
          <Collapse in={Boolean(results)} timeout={500}>
            {results && (
              <>
                {/* CARDS */}
                <Paper elevation={2} sx={{ p: isSmall ? 2 : 3, mb: 4, borderRadius: 3 }}>
                  <Typography variant="h5" sx={{ mb: 2 }}>Estimated Results</Typography>

                  <Grid container spacing={3}>
                    {Object.entries(results.predictions || {}).map(([field, val]) => (
                      <Grid item xs={12} sm={6} md={4} key={field}>
                        <Card sx={{ boxShadow: 2, borderRadius: 3 }}>
                          <CardContent>
                            <Typography variant="subtitle2" color="textSecondary">
                              {field}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2", mt: 0.5 }}>
                              {formatNumber(val)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </>
            )}
          </Collapse>
        </div>

      </Container>
    </Box>
  );
}

export default App;
