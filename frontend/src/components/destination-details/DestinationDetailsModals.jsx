import DestinationGalleryViewer from "@/components/destination-details/DestinationGalleryViewer";
import OutsideKadunaModal from "@/components/OutsideKadunaModal";

export default function DestinationDetailsModals({
  destinationName,
  gallery,
  viewerOpen,
  setViewerOpen,
  activeImage,
  setActiveImage,
  showOutsideKadunaModal,
  setShowOutsideKadunaModal,
}) {
  return (
    <>
      {viewerOpen && gallery.length > 0 && (
        <DestinationGalleryViewer
          destinationName={destinationName}
          gallery={gallery}
          activeImage={activeImage}
          setActiveImage={setActiveImage}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <OutsideKadunaModal
        isOpen={showOutsideKadunaModal}
        onClose={() => setShowOutsideKadunaModal(false)}
      />
    </>
  );
}
