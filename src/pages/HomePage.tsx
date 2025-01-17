import React, { useEffect, useState } from "react";
import { BarChart, Phone, Clock, CheckCircle, XCircle } from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import type { Campaign } from "../types";

interface CallData {
  id: string;
  timestamp: number;
  durationSeconds: number;
  endedReason: string;
  recordingUrl: string;
  phoneNumber: {
    number: string;
  };
  customer: {
    number: string;
  };
  transcript: string;
  messages: Array<{
    message: string;
    role: string;
  }>;
}

interface EndedReasonStats {
  [key: string]: number;
}

function HomePage() {
  const [metrics, setMetrics] = useState({
    totalCalls: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    averageDuration: 0,
    totalTalkMinutes: 0,
  });
  const [endedReasonStats, setEndedReasonStats] = useState<EndedReasonStats>(
    {},
  );
  const [calls, setCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch campaigns
        const campaignsSnapshot = await getDocs(collection(db, "campaigns"));
        const campaigns = campaignsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Campaign[];

        const activeCampaigns = campaigns.filter(
          (c) => c.status === "active",
        ).length;
        const completedCampaigns = campaigns.filter(
          (c) => c.status === "ended" || c.status === "completed",
        ).length;

        // Fetch calls
        const callsQuery = query(
          collection(db, "calls"),
          orderBy("timestamp", "desc"),
        );
        const callsSnapshot = await getDocs(callsQuery);
        const callsData = callsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CallData[];

        // Calculate metrics
        const totalCalls = callsData.length;
        const totalDuration = callsData.reduce(
          (acc, call) => acc + (call.durationSeconds || 0),
          0,
        );
        const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
        const totalTalkMinutes = Math.round(totalDuration / 60);

        // Calculate ended reason stats
        const reasonStats: EndedReasonStats = {};
        callsData.forEach((call) => {
          if (call.endedReason) {
            reasonStats[call.endedReason] =
              (reasonStats[call.endedReason] || 0) + 1;
          }
        });

        setMetrics({
          totalCalls,
          activeCampaigns,
          completedCampaigns,
          averageDuration,
          totalTalkMinutes,
        });
        setEndedReasonStats(reasonStats);
        setCalls(callsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  function formatDuration(seconds: number) {
    return `${seconds.toFixed(1)}s`;
  }

  function formatMinutes(minutes: number) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Calls"
          value={metrics.totalCalls}
          icon={<Phone className="h-5 w-5 text-indigo-600" />}
        />
        <MetricCard
          title="Active Campaigns"
          value={metrics.activeCampaigns}
          icon={<BarChart className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          title="Completed Campaigns"
          value={metrics.completedCampaigns}
          icon={<CheckCircle className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Avg. Call Duration"
          value={formatDuration(metrics.averageDuration)}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
        />
        <MetricCard
          title="Total Talk Time"
          value={formatMinutes(metrics.totalTalkMinutes)}
          icon={<Clock className="h-5 w-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Call End Reasons
          </h2>
          <div className="space-y-2">
            {Object.entries(endedReasonStats).map(([reason, count]) => (
              <div key={reason} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{reason}</span>
                <span className="text-sm font-medium text-gray-900">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Calls</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date & Time
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Agent Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  End Reason
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Transcript
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Recording
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No calls found
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(call.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.phoneNumber?.number || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.customer?.number || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.endedReason}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {call.messages && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setExpandedTranscript(
                                expandedTranscript === call.id ? null : call.id,
                              )
                            }
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Transcript
                          </button>
                          {expandedTranscript === call.id && (
                            <div className="absolute z-10 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium">
                                  Call Transcript
                                </h4>
                                <button
                                  onClick={() => setExpandedTranscript(null)}
                                  className="text-gray-400 hover:text-gray-500"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                              <pre className="text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {call.transcript}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.recordingUrl && (
                        <a
                          href={call.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Listen
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
      <div className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-4 w-0 flex-1">
            <dl>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {title}
              </dt>
              <dd className="text-lg font-semibold text-gray-900 mt-1">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
