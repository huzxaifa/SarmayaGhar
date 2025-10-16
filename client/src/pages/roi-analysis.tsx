import ROIAnalysisForm from "@/components/ROIAnalysisForm";

export default function ROIAnalysis() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ROI Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Analyze your property investment with AI-powered predictions. Our models automatically predict property prices and rental income based on location and property details - no financial inputs required!
          </p>
        </div>
        <ROIAnalysisForm />
      </div>
    </div>
  );
}
