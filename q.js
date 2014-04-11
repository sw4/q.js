// Helpers
function format_percentage(value, decimal) {
    decimal=decimal||2;
    value = value*100;
    return value.toFixed(decimal);
}
var Array={
    max:function (array) {
        return Math.max.apply(Math, array);
    },
    min:function (array) {
        return Math.min.apply(Math, array);
    }
};

// Statistics

function statMean (series) {
    var sum = 0, 
        n = series.length;
        
    series.forEach(function(dataPoint){
        sum += parseFloat(dataPoint);
    });
    return sum / n;
}

function statVar(series) {
    var n = series.length,
        mean = statMean(series),
        sum = 0;
    series.forEach(function(dataPoint){
        sum += Math.pow((parseFloat(dataPoint) - parseFloat(mean)), 2);
    });
    return sum / n;
}

function statStdDev(series) {
    return Math.sqrt(statVar(series));
}


function statVar(series) {
    // calculates sample variance 
    var n = series.length,
        mean = statMean(series),
        sum = 0;
    series.forEach(function(dataPoint){
        sum += Math.pow((dataPoint - mean), 2);
    });
    // below to be debugged 
    return (n > 1)? (sum / (n - 1)) : sum;
}

function statHistVar(series, p) {
    var sample = series.slice(),
        n = sample.length;
        
    sample.sort();
    sample.reverse();
    
    p = p || 90;  
    p = (p > 1) ?  p * 0.01 :p;
    return sample[Math.ceil((n - 1) * p)];
}

function statRange(series) {
    // calculates range 
    return (Array.max(series) - Array.min(series));
}

function statSimpleRegression(x, y) {
    var n = Array.min([x.length, y.length]),
        mean_x = statMean(x),
        mean_y = statMean(y),
        SS_x = 0,
        SS_y = 0,
        SS_xy = 0;
    for (var i = 0; i < n; i++) {
        SS_x += Math.pow((x[i] - mean_x), 2);
        SS_y += Math.pow((y[i] - mean_y), 2);
        SS_xy += (x[i] - mean_x) * (y[i] - mean_y);
    }
    output['rSlope'] = (SS_xy / SS_x) || 0;
    output['rIntercept'] = (100 * (mean_y - output['rSlope'] * mean_x)).toFixed(3) || 0;
    output['rError'] = (100 * (Math.sqrt((SS_y - output['rSlope'] * SS_xy) / (n - 2)))).toFixed(2);
    output['rCorrCoef'] = SS_xy / Math.sqrt(SS_x * SS_y);
    output['rCoefDetermination'] = Math.pow(output['rCorrCoef'], 2);
    output['rCovar'] = ((SS_xy / (n - 1)) * 100).toFixed(3);
    output['rTStat'] = (output['rCorrCoef'] / Math.sqrt((1 - output['rCoefDetermination']) / (n - 2))).toFixed(2);
    output['rSlope'] = output['rSlope'].toFixed(3);
    output['rCorrCoef'] = output['rCorrCoef'].toFixed(3);
    output['rCoefDetermination'] = output['rCoefDetermination'].toFixed(2);
    return output;
}

function statSeries(series) {
    var output={};
    output.value.push("");
    output.positive.push("");
    output.negative.push("");
    output.cumulative.push("");
    
    output.cumulative[0] = 100;
    series.forEach(function(dataPoint){
        value = parseFloat(dataPoint);
        output.value.push(value);
        value >= 0 ?  output.positive.push(value): output.negative.push(value);        
        output.cumulative.push(output.cumulative[output.cumulative.length - 1] += output.cumulative[output.cumulative.length - 1] * value);
    });
    output.cumulative.shift();
    return output;
}


// Compile

function dataCompile(data, shiftMin, shiftMax) {

    // copy array to prevent any operations happening to pointer (_raw); 
    var _data = $.extend(true, [], data);
    var dateRange = [];

    // function to get the difference in months between two dates 
    function monthDiff(d1, d2) {
        months = (d2.getMonth() - d1.getMonth() + (12 * (d2.getFullYear() - d1.getFullYear())));
        return months;
    }

    // loop through instruments to get the minimum and maximum consistent(normalized, net range) dates, and absolute(gross range) dates 

    if (shiftMin || shiftMax) {
        dateRange['normMin'] = Date.parse(shiftMin);
        dateRange['normMax'] = Date.parse(shiftMax);
    } else {
        $.each(_data, function (index) {
            if (index == 0) {
                dateRange['normMin'] = Date.parse(_data[index].data.date[0]);
                dateRange['absMin'] = Date.parse(_data[index].data.date[0]);
            } else if (Date.parse(_data[index].data.date[0]) > dateRange['normMin']) {
                dateRange['normMin'] = Date.parse(_data[index].data.date[0]);
            } else if (Date.parse(_data[index].data.date[0]) < dateRange['absMin']) {
                dateRange['absMin'] = Date.parse(_data[index].data.date[0]);
            }
            if (index == 0) {
                dateRange['normMax'] = Date.parse(_data[index].data.date[_data[index].data.date.length - 1]);
                dateRange['absMax'] = Date.parse(_data[index].data.date[_data[index].data.date.length - 1]);
            } else if (Date.parse(_data[index].data.date[_data[index].data.date.length - 1]).getTime() < dateRange['normMax'].getTime()) {
                dateRange['normMax'] = Date.parse(_data[index].data.date[_data[index].data.date.length - 1]);
            } else if (Date.parse(_data[index].data.date[_data[index].data.date.length - 1]).getTime() > dateRange['absMax'].getTime()) {
                dateRange['absMax'] = Date.parse(_data[index].data.date[_data[index].data.date.length - 1]);
            }
        });
    }


    dateRange['normRange'] = monthDiff(dateRange['normMin'], dateRange['normMax']);


    _instrument = [];

    $.each(_data, function (index) {
        // for each instrument, shift or pop the available data to fit within consistent time frame across instrument set 
        normArrayShift = monthDiff(Date.parse(_data[index].data.date[0]), dateRange['normMin']);
        normArrayPop = -1 * monthDiff(Date.parse(_data[index].data.date[_data[index].data.date.length - 1]), dateRange['normMax']);

        // absArrayShift=-1*(monthDiff(Date.parse(_data[index].data.date[0]), dateRange['absMin'])); 
        // absArrayPop=(monthDiff(Date.parse(_data[index].data.date[_data[index].data.date.length-1]), dateRange['absMax'])); 

        if (normArrayShift > 0) {
            _data[index].data.date.splice(0, normArrayShift);
            _data[index].data.performance.splice(0, normArrayShift);
            _data[index].data.price.splice(0, normArrayShift);
        }
        if (normArrayPop > 0) {
            _data[index].data.date.splice(normArrayPop * -1, normArrayPop);
            _data[index].data.performance.splice(normArrayPop * -1, normArrayPop);
            _data[index].data.price.splice(normArrayPop * -1, normArrayPop);
        }
        _instrument[index] = new Object();
        _instrument[index].type = _data[index].type;
        _instrument[index].name = _data[index].name;
        _instrument[index].rfr = parseFloat(_data[index].rfr / 100);
        _instrument[index].color = _data[index].color;
        _instrument[index].date = new Object();
        _instrument[index].date.series = new Object();
        _instrument[index].date.series.value = _data[index].data.date;
        _instrument[index].price = new Object();
        _instrument[index].price.series = new Object();
        _instrument[index].price.series.value = _data[index].data.price;
        _instrument[index].performance = new Object();
        _instrument[index].performance.series = new Object();
        _instrument[index].performance.series = statSeries(_data[index].data.performance);
        _instrument[index].performance.regression = statSimpleRegression(_instrument[index].performance.series.value, _instrument[0].performance.series.value);
        _instrument[index].performance.count = _instrument[index].performance.series.value.length;

        if (_instrument[index].performance.count < 13) {
            _instrument[index].performance.cuml1yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[0]) / _instrument[index].performance.series.cumulative[0]);
        } else {
            _instrument[index].performance.cuml1yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 13]) / _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 13]);
        }
        if (_instrument[index].performance.count < 38) {
            _instrument[index].performance.cuml3yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[0]) / _instrument[index].performance.series.cumulative[0]);
        } else {
            _instrument[index].performance.cuml3yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 37]) / _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 37]);
        }
        if (_instrument[index].performance.count < 62) {
            _instrument[index].performance.cuml5yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[0]) / _instrument[index].performance.series.cumulative[0]);
        } else {
            _instrument[index].performance.cuml5yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 61]) / _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 61]);
        }
        if (_instrument[index].performance.count < 84) {
            _instrument[index].performance.cuml7yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[0]) / _instrument[index].performance.series.cumulative[0]);
        } else {
            _instrument[index].performance.cuml7yRtn = format_percentage((_instrument[index].performance.series.cumulative[_instrument[index].performance.count - 1] - _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 83]) / _instrument[index].performance.series.cumulative[_instrument[index].performance.count - 83]);
        }
        _instrument[index].performance.stdDev = statStdDev(_instrument[index].performance.series.value);
        _instrument[index].performance.stdDevPositive = statStdDev(_instrument[index].performance.series.positive);
        _instrument[index].performance.stdDevNegative = statStdDev(_instrument[index].performance.series.negative);

        _instrument[index].performance.annStdDev = _instrument[index].performance.stdDev * Math.sqrt(12);
        _instrument[index].performance.annStdDevPositive = _instrument[index].performance.stdDevPositive * Math.sqrt(12);
        _instrument[index].performance.annStdDevNegative = _instrument[index].performance.stdDevNegative * Math.sqrt(12);
        _instrument[index].performance.stdDev = format_percentage(_instrument[index].performance.stdDev);
        _instrument[index].performance.stdDevPositive = format_percentage(_instrument[index].performance.stdDevPositive);
        _instrument[index].performance.stdDevNegative = format_percentage(_instrument[index].performance.stdDevNegative);
        _instrument[index].performance.range = format_percentage(statRange(_instrument[index].performance.series.value));
    //    _instrument[index].performance.
    //    var = format_percentage(statVar(_instrument[index].performance.series.value));
        _instrument[index].performance.histVar95 = format_percentage(statHistVar(_instrument[index].performance.series.value, 95));
        _instrument[index].performance.max = format_percentage(Array.max(_instrument[index].performance.series.value));
        _instrument[index].performance.min = format_percentage(Array.min(_instrument[index].performance.series.value));
        _instrument[index].performance.posCount = _instrument[index].performance.series.positive.length;
        _instrument[index].performance.negCount = _instrument[index].performance.series.negative.length;
        _instrument[index].performance.negMean = format_percentage(statMean(_instrument[index].performance.series.negative));
        _instrument[index].performance.negPercentage = format_percentage(_instrument[index].performance.negCount / _instrument[index].performance.count);
        _instrument[index].performance.posMean = format_percentage(statMean(_instrument[index].performance.series.positive));
        _instrument[index].performance.posPercentage = format_percentage(_instrument[index].performance.posCount / _instrument[index].performance.count);
        _instrument[index].performance.ttlReturn = (_instrument[index].performance.series.cumulative[_instrument[index].performance.series.cumulative.length - 1] - 100) / 100;
        _instrument[index].performance.annCumlReturn = Math.pow(1 + _instrument[index].performance.ttlReturn, 1 / (_instrument[index].performance.count / 12)) - 1;
        _instrument[index].performance.compoundRtn = Math.pow((1 + _instrument[index].performance.ttlReturn), (1 / _instrument[index].performance.count)) - 1;
        _instrument[index].performance.annCompoundRtn = format_percentage(_instrument[index].performance.compoundRtn * Math.sqrt(12));
        _instrument[index].performance.compoundRtn = format_percentage(_instrument[index].performance.compoundRtn);
        _instrument[index].performance.ttlReturn = format_percentage(_instrument[index].performance.ttlReturn);

        _instrument[index].performance.sharpe = ((_instrument[index].performance.annCumlReturn - (Math.pow(1 + _instrument[0].rfr, 12) - 1)) / _instrument[index].performance.annStdDev).toFixed(2);
        _instrument[index].performance.sortino = ((_instrument[index].performance.annCumlReturn - (Math.pow(1 + _instrument[0].rfr, 12) - 1)) / _instrument[index].performance.annStdDevNegative).toFixed(2);

        if (index > 0) {
            _instrument[index].performance.jensen = (parseFloat(_instrument[0].performance.annCumlReturn / 100) - (parseFloat((Math.pow(1 + _instrument[0].rfr, 12) - 1) + _instrument[index].performance.regression.rSlope) * parseFloat(_instrument[index].performance.annCumlReturn - (Math.pow(1 + _instrument[0].rfr, 12) - 1)))).toFixed(3);
        }

        _instrument[index].performance.annCumlReturn = format_percentage(_instrument[index].performance.annCumlReturn);
        _instrument[index].performance.annStdDev = format_percentage(_instrument[index].performance.annStdDev);
        _instrument[index].performance.annStdDevPositive = format_percentage(_instrument[index].performance.annStdDevPositive);
        _instrument[index].performance.annStdDevNegative = format_percentage(_instrument[index].performance.annStdDevNegative);

    });
    sliderInit();
    pluginInit();
}

