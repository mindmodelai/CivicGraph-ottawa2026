export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-8 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-lg font-semibold text-gray-700">
          Created by Samuel Hebeisen for the Ottawa 2026 hackathon
        </p>
        <p className="text-lg text-gray-600 mt-1">
          Infrastructure: fully AWS native
        </p>
        <div className="flex justify-center gap-6 mt-3">
          <a href="https://mindmodel.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 transition-colors">
            mindmodel.ai
          </a>
          <a href="https://org.tech" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 transition-colors">
            org.tech
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Data: CRA T3010, Government of Canada Open Data, Government of Alberta Open Data.
        </p>
      </div>
    </footer>
  );
}
