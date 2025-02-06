import TranscriptDialog from "../components/TranscriptDialog";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Phone,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ThumbsUp,
  Clock,
  PhoneOff,
  PhoneCall,
} from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import type { Campaign } from "../types";

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  called: boolean;
  call_id?: string;
  error?: string;
}

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
  messages: Array<{
    message: string;
    role: string;
  }>;
  analysis?: {
    successEvaluation: string;
    structuredData?: {
      "post-call-intent-analysis": string; // 'SALE' | 'RENT' | null
    };
  };
  transcript: string;
  appointment?: {
    date: string;
    time: string;
  };
}

function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<{ [key: string]: CallData }>({});
  const [loading, setLoading] = useState(true);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(
    null,
  );
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  function openTranscript(transcript: string) {
    setSelectedTranscript(transcript);
    setIsDialogOpen(true);
  }

  const [stats, setStats] = useState({
    notCalled: 0,
    called: 0,
    error: 0,
    interested: 0,
    answered: 0,
    notAnswered: 0,
    totalTalkMinutes: 0,
  });

  // useEffect(() => {
  //   async function fetchCampaignData() {
  //     if (!id) return;

  //     try {
  //       // Fetch campaign details
  //       const campaignDoc = await getDoc(doc(db, "campaigns", id));
  //       if (!campaignDoc.exists()) {
  //         throw new Error("Campaign not found");
  //       }
  //       setCampaign({ id: campaignDoc.id, ...campaignDoc.data() } as Campaign);

  //       // Fetch contacts
  //       const contactsSnapshot = await getDocs(
  //         collection(db, `campaigns/${id}/contacts`),
  //       );
  //       const contactsData = contactsSnapshot.docs.map((doc) => ({
  //         id: doc.id,
  //         ...doc.data(),
  //       })) as Contact[];

  //       console.log("Contacts data:", contactsData);

  //       // Fetch call data for contacts with call_id
  //       const callIds = contactsData
  //         .filter((contact) => contact.call_id)
  //         .map((contact) => contact.call_id as string);

  //       if (callIds.length > 0) {
  //         const callsData: { [key: string]: CallData } = {};
  //         let totalDuration = 0;
  //         let answered = 0;
  //         let notAnswered = 0;

  //         for (const callId of callIds) {
  //           const callDoc = await getDoc(doc(db, "calls", callId));
  //           if (callDoc.exists()) {
  //             const callData = callDoc.data() as CallData;
  //             const appointmentDoc = await getDoc(
  //               doc(db, "appointments", callId),
  //             );
  //             if (appointmentDoc.exists()) {
  //               const appointmentData = appointmentDoc.data();
  //               callData.appointment = {
  //                 date: appointmentData.date,
  //                 time: appointmentData.time,
  //               };
  //             }
  //             callsData[callId] = callData;
  //             totalDuration += callData.durationSeconds || 0;

  //             // Count answered vs not answered calls
  //             if (callData.endedReason === "customer-did-not-answer") {
  //               notAnswered++;
  //             } else {
  //               answered++;
  //             }
  //           } else {
  //             try {
  //               // Make API call to VAPI
  //               const response = await fetch(
  //                 `https://api.vapi.ai/call/${callId}`,
  //                 {
  //                   headers: {
  //                     Authorization:
  //                       "Bearer a74661c9-f98f-4af0-afa4-00a0e80ce133",
  //                   },
  //                 },
  //               );

  //               if (response.ok) {
  //                 const callData = await response.json();

  //                 // If call has ended, store it in Firestore
  //                 if (callData.status === "ended") {
  //                   await setDoc(doc(db, "calls", callId), callData);
  //                   callsData[callId] = callData;

  //                   // Update counters
  //                   totalDuration += callData.durationSeconds || 0;
  //                   if (callData.endedReason === "customer-did-not-answer") {
  //                     notAnswered++;
  //                   } else {
  //                     answered++;
  //                   }
  //                 } else {
  //                   // If call hasn't ended, count as not answered
  //                   notAnswered++;
  //                 }
  //               } else {
  //                 // If API call fails, count as not answered
  //                 notAnswered++;
  //               }
  //             } catch (error) {
  //               console.error(
  //                 `Error fetching call data from VAPI for ${callId}:`,
  //                 error,
  //               );
  //               // If there's an error, count as not answered
  //               notAnswered++;
  //             }
  //           }
  //         }

  //         setCalls(callsData);

  //         console.log(contactsData);

  //         // Calculate stats
  //         const notCalled = contactsData.filter((c) => !c.called).length;
  //         const called = contactsData.filter(
  //           (c) => c.called && !c.error,
  //         ).length;
  //         const error = contactsData.filter((c) => c.error).length;
  //         const interested = contactsData.filter((c) => {
  //           const callData = c.call_id ? callsData[c.call_id] : null;
  //           return callData?.analysis?.successEvaluation === "true";
  //         }).length;

  //         setStats({
  //           notCalled,
  //           called,
  //           error,
  //           interested,
  //           answered,
  //           notAnswered,
  //           totalTalkMinutes: Math.round(totalDuration / 60),
  //         });
  //       } else {
  //         const notCalled = contactsData.filter((c) => !c.called).length;
  //         const error = contactsData.filter((c) => c.error).length;
  //         setStats({
  //           notCalled,
  //           called: 0,
  //           error,
  //           interested: 0,
  //           answered: 0,
  //           notAnswered: 0,
  //           totalTalkMinutes: 0,
  //         });
  //       }

  //       setContacts(contactsData);
  //     } catch (error) {
  //       console.error("Error fetching campaign data:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   fetchCampaignData();
  // }, [id]);

  useEffect(() => {
    async function fetchCampaignData() {
      if (!id) return;

      try {
        // Fetch campaign details
        const campaignDoc = await getDoc(doc(db, "campaigns", id));
        if (!campaignDoc.exists()) {
          throw new Error("Campaign not found");
        }
        setCampaign({ id: campaignDoc.id, ...campaignDoc.data() } as Campaign);

        // Fetch contacts
        const contactsSnapshot = await getDocs(
          collection(db, `campaigns/${id}/contacts`),
        );
        const contactsData = contactsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Contact[];

        // Extract call IDs for contacts with call_id
        const callIds = contactsData
          .filter((contact) => contact.call_id)
          .map((contact) => contact.call_id as string);

        const callsData: { [key: string]: CallData } = {};
        let totalDuration = 0;
        let answered = 0;
        let notAnswered = 0;

        if (callIds.length > 0) {
          // Parallel fetching for Firestore and API data
          const callPromises = callIds.map(async (callId) => {
            try {
              // Fetch call data from Firestore
              const callDoc = await getDoc(doc(db, "calls", callId));
              if (callDoc.exists()) {
                const callData = callDoc.data() as CallData;

                // Fetch appointment data (if available)
                const appointmentDoc = await getDoc(
                  doc(db, "appointments", callId),
                );
                if (appointmentDoc.exists()) {
                  const appointmentData = appointmentDoc.data();
                  callData.appointment = {
                    date: appointmentData.date,
                    time: appointmentData.time,
                  };
                }

                // Update stats
                callsData[callId] = callData;
                totalDuration += callData.durationSeconds || 0;
                if (callData.endedReason === "customer-did-not-answer") {
                  notAnswered++;
                } else {
                  answered++;
                }
              } else {
                // If not in Firestore, fetch from VAPI
                const response = await fetch(
                  `https://api.vapi.ai/call/${callId}`,
                  {
                    headers: {
                      Authorization:
                        "Bearer a74661c9-f98f-4af0-afa4-00a0e80ce133",
                    },
                  },
                );

                if (response.ok) {
                  const callData = await response.json();

                  // Save ended calls to Firestore
                  if (callData.status === "ended") {
                    await setDoc(doc(db, "calls", callId), callData);
                    callsData[callId] = callData;
                    totalDuration += callData.durationSeconds || 0;
                    if (callData.endedReason === "customer-did-not-answer") {
                      notAnswered++;
                    } else {
                      answered++;
                    }
                  } else {
                    notAnswered++;
                  }
                } else {
                  notAnswered++;
                }
              }
            } catch (error) {
              console.error(`Error fetching call data for ${callId}:`, error);
              notAnswered++;
            }
          });

          // Wait for all call fetches to complete
          await Promise.all(callPromises);

          // Calculate stats
          const notCalled = contactsData.filter((c) => !c.called).length;
          const called = contactsData.filter(
            (c) => c.called && !c.error,
          ).length;
          const error = contactsData.filter((c) => c.error).length;
          const interested = contactsData.filter((c) => {
            const callData = c.call_id ? callsData[c.call_id] : null;
            return callData?.analysis?.successEvaluation === "true";
          }).length;

          setStats({
            notCalled,
            called,
            error,
            interested,
            answered,
            notAnswered,
            totalTalkMinutes: Math.round(totalDuration / 60),
          });
        } else {
          // No call IDs to process
          const notCalled = contactsData.filter((c) => !c.called).length;
          const error = contactsData.filter((c) => c.error).length;

          setStats({
            notCalled,
            called: 0,
            error,
            interested: 0,
            answered: 0,
            notAnswered: 0,
            totalTalkMinutes: 0,
          });
        }

        setContacts(contactsData);
        setCalls(callsData);
      } catch (error) {
        console.error("Error fetching campaign data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCampaignData();
  }, [id]);

  async function handleEndCampaign() {
    if (!campaign?.id) return;

    try {
      const campaignRef = doc(db, "campaigns", campaign.id);
      await updateDoc(campaignRef, { status: "ended" });
      setCampaign((prev) => (prev ? { ...prev, status: "ended" } : null));
    } catch (error) {
      console.error("Error ending campaign:", error);
    }
  }

  function downloadContacts(
    status: "notCalled" | "error" | "interested" | "notAnswered",
  ) {
    const filteredContacts = contacts.filter((contact) => {
      if (status === "notCalled") return !contact.called;
      if (status === "error") return !!contact.error;
      if (status === "interested") {
        const callData = contact.call_id ? calls[contact.call_id] : null;
        return callData?.analysis?.successEvaluation === "true";
      }
      if (status === "notAnswered") {
        // Include contacts where call_id exists but no call data found
        if (contact.call_id && !calls[contact.call_id]) return true;
        const callData = contact.call_id ? calls[contact.call_id] : null;
        return callData?.endedReason === "customer-did-not-answer";
      }
      return false;
    });

    let csvContent;
    if (status === "interested") {
      csvContent = [
        [
          "Name",
          "Phone Number",
          "Project Name",
          "Unit Number",
          "Rent/Sale Intent",
          "Appointment Date",
          "Appointment Time",
          "Transcript",
          "Recording URL",
        ],
        ...filteredContacts.map((contact) => {
          const callData = contact.call_id ? calls[contact.call_id] : null;
          const appointmentData = callData?.appointment || {};
          return [
            contact.name || "",
            contact.phone_number,
            contact.project_name || "",
            contact.unit_number || "",
            callData?.analysis?.structuredData?.["post-call-intent-analysis"] ||
              "N/A",
            appointmentData.date || "N/A",
            appointmentData.time || "N/A",
            callData?.transcript || "N/A",
            callData?.recordingUrl || "N/A",
          ];
        }),
      ];
    } else {
      // Default CSV format for other statuses
      csvContent = [
        [
          "Name",
          "Phone Number",
          "Project Name",
          "Unit Number",
          "Status",
          "Error",
        ],
        ...filteredContacts.map((contact) => [
          contact.name || "",
          contact.phone_number,
          contact.project_name || "",
          contact.unit_number || "",
          status,
          contact.error || "",
        ]),
      ];
    }

    const csvString = csvContent
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign?.name}_${status}_contacts.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  function formatDuration(seconds: number) {
    return `${seconds?.toFixed(1)}s`;
  }

  function formatMinutes(minutes: number) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  function formatTranscript(
    messages: Array<{ message: string; role: string }>,
  ) {
    return messages
      .filter((msg) => msg.role === "bot" || msg.role === "human")
      .map((msg) => `${msg.role === "bot" ? "AI" : "Customer"}: ${msg.message}`)
      .join("\n");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/campaigns")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {campaign.name}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date(campaign.created_at).toLocaleDateString()} ·{" "}
              {campaign.timezone}
            </p>
            <p className="text-sm text-gray-500">
              Campaign Period:{" "}
              {new Date(campaign.campaign_start_date).toLocaleDateString()} -{" "}
              {new Date(campaign.campaign_end_date).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              Daily Time: {campaign?.start_time} - {campaign?.end_time}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(campaign.created_at).toLocaleDateString()} ·{" "}
              {campaign.timezone}
            </p>
          </div>
        </div>
        {(campaign.status === "active" ||
          campaign.status === "in-progress") && (
          <button
            onClick={handleEndCampaign}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            End Campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Not Called</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.notCalled}
                </p>
              </div>
              <Phone className="h-8 w-8 text-gray-400" />
            </div>
            {stats.notCalled > 0 && (
              <button
                onClick={() => downloadContacts("notCalled")}
                className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
              >
                <Download className="h-4 w-4 mr-1" />
                Download List
              </button>
            )}
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Called</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.called}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Errors</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.error}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            {stats.error > 0 && (
              <button
                onClick={() => downloadContacts("error")}
                className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
              >
                <Download className="h-4 w-4 mr-1" />
                Download List
              </button>
            )}
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Interested</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.interested}
                </p>
              </div>
              <ThumbsUp className="h-8 w-8 text-blue-500" />
            </div>
            {stats.interested > 0 && (
              <button
                onClick={() => downloadContacts("interested")}
                className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
              >
                <Download className="h-4 w-4 mr-1" />
                Download List
              </button>
            )}
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Talk Time
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatMinutes(stats.totalTalkMinutes)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Answer Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.called > 0
                    ? Math.round((stats.answered / stats.called) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center text-green-500 text-sm mb-1">
                  <PhoneCall className="h-4 w-4 mr-1" />
                  {stats.answered}
                </div>
                <div className="flex items-center text-red-500 text-sm">
                  <PhoneOff className="h-4 w-4 mr-1" />
                  {stats.notAnswered}
                </div>
              </div>
            </div>
            {stats.notAnswered > 0 && (
              <button
                onClick={() => downloadContacts("notAnswered")}
                className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Not Answered
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-100">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Contact List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
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
                  Project Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Unit Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
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
                  Interested
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rent/Sale Intent
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Appointment
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Recording
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Transcript
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => {
                const callData = contact.call_id
                  ? calls[contact.call_id]
                  : null;
                const isNotAnswered = contact.call_id && !callData;
                return (
                  <tr key={contact.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contact.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData ? formatDate(callData.timestamp) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.phoneNumber?.number || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.customer?.number || contact.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.project_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.unit_number || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contact.error
                            ? "bg-red-100 text-red-800"
                            : contact.called
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {contact.error ? (
                          <XCircle className="h-4 w-4 mr-1" />
                        ) : contact.called ? (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <Phone className="h-4 w-4 mr-1" />
                        )}
                        {contact.error
                          ? "Error"
                          : contact.called
                            ? "Called"
                            : "Not Called"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData
                        ? formatDuration(callData.durationSeconds)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isNotAnswered
                        ? "customer-did-not-answer"
                        : callData?.endedReason || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.analysis?.successEvaluation === "true" ? (
                        <span className="text-green-600 font-medium">YES</span>
                      ) : callData?.analysis?.successEvaluation === "false" ? (
                        <span className="text-red-600 font-medium">NO</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.analysis?.structuredData?.[
                        "post-call-intent-analysis"
                      ] || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.appointment
                        ? `${callData.appointment.date} & ${callData.appointment.time}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {callData?.recordingUrl ? (
                        <a
                          href={callData.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Listen
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {callData?.messages && callData.messages.length > 0 ? (
                        <div className="relative">
                          <button
                            onClick={() => openTranscript(callData.transcript)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <TranscriptDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        transcript={selectedTranscript}
      />
    </div>
  );
}

export default CampaignDetailPage;
