import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";
export default function ProbabilityDoughnut({ p }) {
  const spam = Math.round(p*100), ham = 100-spam;
  return <div style={{height:260}}>
    <Doughnut data={{labels:["Spam","Ham"], datasets:[{data:[spam,ham]}]}}
              options={{plugins:{legend:{position:"bottom"}},cutout:"70%",responsive:true}}/>
  </div>;
}
